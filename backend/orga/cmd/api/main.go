package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/orga/internal/config"
	"backend/orga/internal/db"
	"backend/orga/internal/handlers"
	"backend/shared/middleware"

	"github.com/gofiber/fiber/v3"
)

func main() {
	env, err := config.LoadEnv()
	if err != nil {
		log.Fatalf("[FATAL] Failed to load configuration: %v", err)
	}

	dbConn := db.InitDB(env)

	app := fiber.New(fiber.Config{
		AppName: "ft_box_orga v1.0",
		BodyLimit: 4 * 1024 * 1024,
	})

	// Routes
	app.Get("/api/orga/orgs", func(c fiber.Ctx) error {
		return handlers.GetOrgas(c, dbConn)
	})
	app.Post("/api/orga/orgs", func(c fiber.Ctx) error {
		return handlers.CreateOrga(c, dbConn)
	})
	app.Patch("/api/orga/orgs/:org_id", middleware.CheckRoleAdmin(dbConn), func(c fiber.Ctx) error {
		return handlers.ChangeOrgaName(c, dbConn)
	})
	app.Delete("/api/orga/orgs/:org_id", middleware.CheckRoleAdmin(dbConn), func(c fiber.Ctx) error {
		return handlers.DeleteOrga(c, dbConn)
	})

	app.Post("/api/orga/orgs/:org_id/member", func(c fiber.Ctx) error {
		return handlers.CreateOrgaMember(c, dbConn)
	})

	// Run
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