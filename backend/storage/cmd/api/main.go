package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	files "backend/storage/internal"

	"backend/shared/config"
	"backend/shared/db"
	"backend/storage/internal/handlers"
	"backend/storage/internal/service"
	"backend/storage/internal/workers"

	"backend/shared/middleware"
	"backend/shared/rbac"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
)

func initConsumerGroups(client *redis.Client) {
	streams := map[string]string{
		"events:domain:file_orphaned":	"storage-file-orphaned",
		"events:domain:user_deleted":	"storage-user-deleted",
		"events:domain:org_deleted":	"storage-org-deleted",
	}
	for stream, group := range streams {
		err := client.XGroupCreateMkStream(context.TODO(), stream, group, "0").Err()
		if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
			log.Fatalf("[FATAL] Cannot create consumer group for %s: %v", stream, err)
		}
		log.Printf("[INFO] Consumer group ready: %s → %s", stream, group)
	}
}

func main() {
	env, err := config.LoadEnv()
	if err != nil {
		log.Fatalf("[FATAL], Failed to load configuration: %v", err)
	}

	database := db.InitDB(env)

	app := fiber.New(fiber.Config{
		AppName: "ostrom_storage_service v1.0",
		BodyLimit: 4 * 1024 * 1024, // 4 MB max per requests
	})

	minioUser, err := config.ReadSecret("minio_admin_user")
	if err != nil {
		log.Fatalf("[FATAL] Could not read MinIO user secret: %v", err)
	}

	minioPassword, err := config.ReadSecret("minio_admin_pwd")
	if err != nil {
		log.Fatalf("[FATAL] Could not read MinIO password secret: %v", err)
	}

	// redisClient used for the business logic
	redisAddr := fmt.Sprintf("redis:%s", env.RedisPort)
	redisClient := redis.NewClient(&redis.Options{
		Addr:		redisAddr,
		Password:	env.RedisPassword,
	})
	initConsumerGroups(redisClient)

	defer func() {
		if err := redisClient.Close(); err != nil {
			log.Printf("[WARN] Redis client close error: %v", err)
		}
	}()

	eventPublisher := workers.NewEventPublisher(redisClient)

	// internal Docker network — SSL not required
	useSSL := false
	minioEndpoint := fmt.Sprintf(("minio:%s"), env.MinioPort)

	minioClient, err := files.NewMinioClient(minioEndpoint, minioUser, minioPassword, useSSL)
	if err != nil {
		log.Fatalf("[FATAL] MinIO client init failed: %v\n", err)
	}

	err = files.InitMinioBucket(minioClient, "ostrom")
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize MinIO bucket: %v\n", err)
	}

	checker := rbac.NewDBChecker(database)

	repo := files.NewStorageRepository(database)
	svc := service.NewStorageService(repo, minioClient, eventPublisher, checker, env)
	handler := handlers.NewStorageHandler(svc, env)

	consumer := workers.NewEventConsumer(repo, minioClient)
	go consumer.ConsumeOrgDeleted(context.TODO(), redisClient)
	go consumer.ConsumeUserDeleted(context.TODO(), redisClient)
	go consumer.ConsumeFileOrphaned(context.TODO(), redisClient)

	go consumer.PeriodicSweep(context.TODO(), 15 * time.Minute)

	api := app.Group("/api")
	api.Use(middleware.ProtectedRoute(env.JwtSecret))

	// file
	api.Post("/files/upload-url",		handler.RequestUploadURL)
	api.Post("/files/finalize",			handler.FinalizeUpload)
	api.Get("/files/:file_id/download", handler.DownloadFile)
	api.Get("/files/:file_id",			handler.GetFileInfo)
	api.Patch("/files/:file_id",		handler.MoveFile)
	api.Delete("/files/:file_id",		handler.DeleteFile)

	// folder
	api.Post("/folders",									handler.CreateFolder)
	api.Patch("/folders/:folder_id",						handler.UpdateFolder)
	api.Delete("/folders/:folder_id",						handler.DeleteFolder)
	api.Get("/folders",										handler.ListPersonalContents) // can have a query string
	api.Get("/folders/:folder_id/contents",					handler.ListFolderContents)
	api.Get("/orgs/:org_id/folders/:folder_id/contents",	handler.ListOrgContents)

	go func() {
		if err := app.Listen(":8083"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()

	log.Println("[INFO] Files service started on :8083")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Shutting down...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("[ERROR] Failed to shutdown Fiber: %v", err)
	}

	log.Println("[INFO] Server stopped successfully.")
}
