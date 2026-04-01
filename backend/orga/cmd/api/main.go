package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/shared/config"
	"backend/shared/db"
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

	orgaHandler := handlers.NewOrgaHandler(dbConn)

	// Middlewares
	api := app.Group("/api")
	api.Use(middleware.ProtectedRoute(env.JwtSecret))

	// routes without org_id
	api.Get("/orgs", orgaHandler.GetOrgas)
	api.Post("/orgs", orgaHandler.CreateOrga)

	// org
	org := api.Group("/orgs/:org_id")
	org.Use(middleware.CheckOrgaExist(dbConn))

	admin := middleware.CheckUserIsAdmin(dbConn)
	member := middleware.CheckUserInOrga(dbConn)

	// org routes
	org.Patch("/", orgaHandler.ChangeOrgaName)
	org.Delete("/", orgaHandler.DeleteOrga)

	// members
	org.Post("/members", admin, orgaHandler.CreateOrgaMember)
	org.Patch("/members/:user_id", admin, orgaHandler.ChangeRole)
	org.Delete("/members/me", member, orgaHandler.LeaveOrga)
	org.Delete("/members/:user_id", admin, orgaHandler.DeleteMember)
	org.Get("/members", member, orgaHandler.GetMembers)

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