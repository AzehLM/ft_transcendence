package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"auth/backend/internal/config"
	"auth/backend/internal/db"
	"github.com/gofiber/fiber/v2"
	"auth/backend/internal/handlers"
)

func main() {
	env, err := config.LoadEnv()
	if err != nil {
		log.Fatalf("[FATAL] Failed to load configuration: %v", err)
	}

	dbConn := db.InitDB(env)

	_ = dbConn //tmp

	app := fiber.New(fiber.Config{
		AppName: "ft_box_auth v1.0",
		BodyLimit: 4 * 1024 * 1024, // 4 MB max per request
	})

	authHandler := handlers.NewAuthHandler(dbConn, env)

	app.Post("/api/auth/register", authHandler.RegisterUser)

	go func() {
		log.Println("[INFO] Starting Fiber server on port 3000...")
		if err := app.Listen(":3000"); err != nil {
			log.Fatalf("[FATAL] Critical Fiber server error: %v", err)
		}
	}()


	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// The main thread blocks here and waits for a signal in the channel
	<-quit
	log.Println("[INFO] System interrupt signal received (SIGINT/SIGTERM)")

	if err := app.Shutdown(); err != nil {
		log.Fatalf("[ERROR] Failed to shutdown Fiber: %v", err)
	}

	log.Println("[INFO] Server stopped successfully.")
}