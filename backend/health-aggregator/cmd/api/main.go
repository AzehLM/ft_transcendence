package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/health-aggregator/internal/handlers"

	"github.com/gofiber/fiber/v3"
)

func main() {

	app := fiber.New(fiber.Config{
		AppName:   "ostrom_health_aggregator v1.0",
	})

	healthHandler := handlers.NewHealthHandler()

	app.Get("/api/health", healthHandler.Checker)

	go func() {
		if err := app.Listen(":8084"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()

	log.Println("[INFO] Health aggregator service started on :8084")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Shutting down...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("[ERROR] Failed to shutdown Fiber: %v", err)
	}

	log.Println("[INFO] Server stopped successfully.")
}
