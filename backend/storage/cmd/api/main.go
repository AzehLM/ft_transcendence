package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	files "backend/storage/internal"

	"backend/shared/config"
	"backend/shared/db"
	"backend/storage/internal/service"
	"backend/storage/internal/handlers"

	"backend/shared/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
)

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

	redisPassword, err := config.ReadSecret("redis_pwd")
	if err != nil {
		log.Fatalf("[FATAL] Could not read Redis password secret: %v", err)
	}

	// redisClient used for the business logic
	redisClient := redis.NewClient(&redis.Options{
		Addr:     "redis:6379",
		Password: redisPassword,
	})

	// internal Docker network — SSL not required
	useSSL := false
	minioEndpoint := "minio:9000"

	minioClient, err := files.NewMinioClient(minioEndpoint, minioUser, minioPassword, useSSL)
	if err != nil {
		log.Fatalf("[FATAL] MinIO client init failed: %v\n", err)
	}

	err = files.InitMinioBucket(minioClient, "ostrom")
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize MinIO bucket: %v\n", err)
	}

	repo := files.NewStorageRepository(database)
	service := service.NewStorageService(repo, minioClient, redisClient)
	handler := handlers.NewStorageHandler(service)

	api := app.Group("/api")
	api.Use(middleware.ProtectedRoute(env.JwtSecret))

	api.Post("/files/upload-url",		handler.RequestUploadURL)
	api.Post("/files/finalize",			handler.FinalizeUpload)
	api.Get("/files/:file_id/download", handler.DownloadFile)
	api.Patch("/files/:file_id",		handler.MoveFile)
	api.Delete("/files/:file_id",		handler.DeleteFile)

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
