package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/auth/internal/handlers"
	"backend/shared/config"
	"backend/shared/db"

	"backend/shared/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

func main() {
	env, err := config.LoadEnv()
	if err != nil {
		log.Fatalf("[FATAL] Failed to load configuration: %v", err)
	}

	dbConn := db.InitDB(env)

	app := fiber.New(fiber.Config{
		AppName:   "ft_box_auth v1.0",
		BodyLimit: 4 * 1024 * 1024, // 4 MB max per request,
	})

	loginLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c fiber.Ctx) error {
			log.Printf("[SECURITY] Rate limit reached for IP: %s\n", c.IP())
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too_many_attempts_please_try_again_later",
			})
		},
	})

	authHandler := handlers.NewAuthHandler(dbConn, env)

	app.Post("/api/auth/register", authHandler.RegisterUser)
	app.Post("/api/auth/login", loginLimiter, authHandler.LoginUser)
	app.Post("/api/auth/salt", authHandler.GetClientSalt)
	app.Post("/api/auth/refresh", authHandler.RefreshToken)
	app.Post("/api/auth/logout", authHandler.LogoutUser)

	api := app.Group("/api")
	api.Use(middleware.ProtectedRoute(env.JwtSecret))

	api.Get("/auth/me", authHandler.GetInfo)
	api.Delete("/auth/me", authHandler.DeleteUser)
	api.Put("/auth/password", authHandler.UpdatePassword)

	go func() {
		log.Println("[INFO] Starting Fiber server on port 8081...")
		if err := app.Listen(":8081"); err != nil {
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
