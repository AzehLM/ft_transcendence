package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	files "backend/storage/internal"

	"backend/shared/config"
	"backend/shared/db"
	"backend/storage/internal/service"

	// "backend/shared/middleware"

	"github.com/redis/go-redis/v9"
	"github.com/gofiber/fiber/v3"
	// "github.com/gofiber/fiber/v3/middleware/limiter"
)

func main() {

	env, err := config.LoadEnv()
	if err != nil {
		log.Fatalf("[FATAL], Failed to load configuration: %v", err)
	}

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
		Addr: "redis:6379",
		Password: redisPassword,
	})

	ctx := context.Background()

	err = redisClient.Set(ctx, "foo", "bar", 0).Err()
	if err != nil {
		panic(err)
	}

	val, err := redisClient.Get(ctx, "foo").Result()
	if err != nil {
		panic(err)
	}
	log.Println("[REDIS LOG] foo", val) // >>> foo bar

	// true in prod ? (http vs https, to talk with the minio server)
	// since the communication is always via the docker network, I'm not sure we need to make it true in prod but I'll have to check further is that is really a concern
	useSSL := false
	minioEndpoint := "minio:9000"

	minioClient, err := files.NewMinioClient(minioEndpoint, minioUser, minioPassword, useSSL)
	if err != nil {
		log.Fatalf("[FATAL] MinIO client init failed: %v\n", err)
	}

	err = files.InitMinioBucket(minioClient, "ostrom")
	if err != nil {
		log.Fatalf("[FATAL] ca degage: %v\n", err)
	}

	log.Printf("[INFO] minioClient: %#v\n", minioClient)
	// log.Printf("[INFO] MinIO client initialized")

	database := db.InitDB(env)

	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("[FATAL] Could not get underlying DB: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("[FATAL] DB unreachable: %v", err)
	}
	log.Println("[INFO] DB connection OK")

	// repo := files.NewStorageRepository(database)
	// runSmokeTest(database, repo)

	app := fiber.New(fiber.Config{})

	// app.Post("/storage/upload-url", middleware.ProtectedRoute(env.JwtSecret), handler.UploadURL)

	go func() {
		if err := app.Listen(":8083"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()

	// to follow Lou-Anne comments on self-contained handlers (to keep routes definition clean):
	// minioClient := minio.New(...)
	// repo := files.NewStorageRepository(database) // I already have this a bit further up
	repo := files.NewStorageRepository(database)
	svc := service.NewStorageService(repo, minioClient, nil) // nil pour redis pour l'instant
	runServiceSmokeTest(database, svc)
	// service := files.NewService(repo, minioClient)
	// handler := files.NewStorageHandler(service)

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
