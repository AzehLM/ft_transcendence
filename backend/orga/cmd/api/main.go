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

	// Orgs Routes
	app.Get("/api/orgs", middleware.ProtectedRoute(env.JwtSecret), orgaHandler.GetOrgas)
	app.Post("/api/orgs", middleware.ProtectedRoute(env.JwtSecret), orgaHandler.CreateOrga)
	app.Patch("/api/orgs/:org_id", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserIsAdmin(dbConn),
		orgaHandler.ChangeOrgaName)
	
	app.Delete("/api/orgs/:org_id", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserIsAdmin(dbConn),
		orgaHandler.DeleteOrga)

	// Members Routes
	app.Post("/api/orgs/:org_id/members", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserIsAdmin(dbConn),
		orgaHandler.CreateOrgaMember)

	app.Patch("/api/orgs/:org_id/members/:user_id", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserIsAdmin(dbConn),
		orgaHandler.ChangeRole)

	app.Delete("/api/orgs/:org_id/members/me", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserInOrga(dbConn),
		orgaHandler.LeaveOrga)

	app.Delete("/api/orgs/:org_id/members/:user_id", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserIsAdmin(dbConn),
		orgaHandler.DeleteMember)

	app.Get("/api/orgs/:org_id/members/", middleware.ProtectedRoute(env.JwtSecret), 
		middleware.CheckOrgaExist(dbConn), 
		middleware.CheckUserInOrga(dbConn),
		orgaHandler.GetMembers)


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