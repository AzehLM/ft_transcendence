package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"backend/orga/internal/handlers"
	"backend/shared/config"
	"backend/shared/db"
	"backend/shared/middleware"

	"github.com/gofiber/fiber/v3"
)

func main() {
	env, err := config.LoadEnv()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[FATAL] Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	dbConn := db.InitDB(env)

	app := fiber.New(fiber.Config{
		AppName:   "ft_box_orga v1.0",
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

	admin := middleware.RequireRole(dbConn, "admin")
	member := middleware.RequireRole(dbConn, "admin", "member")

	// org routes
	org.Patch("/", admin, orgaHandler.ChangeOrgaName)
	org.Delete("/", admin, orgaHandler.DeleteOrga)
	org.Patch("/maxspace", admin, orgaHandler.PatchMaxSpace)
	org.Patch("/usedspace", member, orgaHandler.PatchUsedSpace)

	// members
	org.Post("/members", admin, orgaHandler.CreateOrgaMember)
	org.Patch("/members/:user_id", admin, orgaHandler.ChangeRole)
	org.Delete("/members/me", member, orgaHandler.LeaveOrga)
	org.Delete("/members/:user_id", admin, orgaHandler.DeleteMember)
	org.Get("/members", member, orgaHandler.GetMembers)
	org.Get("/members/key", member, orgaHandler.GetMemberPrivateKey)

	// Run
	go func() {
		fmt.Println("[INFO] Starting Fiber server on port 8082...")
		if err := app.Listen(":8082"); err != nil {
			fmt.Fprintf(os.Stderr, "[FATAL] Critical Fiber server error: %v\n", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// The main thread blocks here and waits for a signal in the channel
	<-quit
	fmt.Println("[INFO] System interrupt signal received (SIGINT/SIGTERM)")

	if err := app.Shutdown(); err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] Failed to shutdown Fiber: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("[INFO] Server stopped successfully.")
}
