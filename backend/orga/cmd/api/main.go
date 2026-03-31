package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/orga/internal/handlers"
	"backend/orga/internal/ws"
	"backend/shared/config"
	"backend/shared/db"
	"backend/shared/middleware"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
)

func main() {
	env, err := config.LoadEnv()
	if err != nil {
		log.Fatalf("[FATAL] Failed to load configuration: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{Addr: "redis:6379"})

	dbConn := db.InitDB(env)
	wsHub := ws.NewHub(redisClient, dbConn)

	app := fiber.New(fiber.Config{
		AppName:   "ft_box_orga v1.0",
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

	app.Post("/api/orga/orgs/:org_id/members", func(c fiber.Ctx) error {
		return handlers.CreateOrgaMember(c, dbConn)
	})
	app.Patch("/api/orga/orgs/:org_id/members/:user_id", middleware.CheckRoleAdmin(dbConn), func(c fiber.Ctx) error {
		return handlers.ChangeRole(c, dbConn)
	})
	app.Delete("/api/orga/orgs/:org_id/members/me", func(c fiber.Ctx) error {
		return handlers.LeaveOrga(c, dbConn)
	})
	app.Delete("/api/orga/orgs/:org_id/members/:user_id", middleware.CheckRoleAdmin(dbConn), func(c fiber.Ctx) error {
		return handlers.DeleteMember(c, dbConn)
	})
	app.Get("/api/orga/orgs/:org_id/members/", func(c fiber.Ctx) error {
		return handlers.GetMembers(c, dbConn)
	})

	app.Get("/ws/notifications",
		middleware.ProtectedRoute(env.JwtSecret),
		func(c fiber.Ctx) error {
			if c.IsWebSocket() {
				return c.Next()
			}
			return fiber.ErrUpgradeRequired
		},
		websocket.New(wsHub.GlobalWSHandler),
	)
	// Run
	go func() {
		log.Println("[INFO] Starting Fiber server on port 8082...")
		if err := app.Listen(":8082"); err != nil {
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
