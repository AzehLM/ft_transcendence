package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/shared/config"  // Pour LoadEnv() depuis shared/config
	"backend/shared/db"      // Pour InitDB() depuis shared/db
	"backend/files/internal" // Pour NewFileRepository() – adapte si c'est repository.go

	"github.com/gofiber/fiber/v3"
)

func main() {
	// config pas declarer (réutilisé ce que Pierrick a fait ?)
	env, err := config.LoadEnv()
	if (err != nil) {
		log.Fatalf("[FATAL], Failed to load configuration: %v", err)
	}

	log.Printf("[INFO] env values: %s | %s | %s\n", env.PostgresDBname, env.PostgresHost, env.PostgresPort)

	// meme chose pour db
	database := db.InitDB(env)

	// faut compiler avant de pouvoir tester...
	_ = files.NewFileRepository(database)


	app := fiber.New(fiber.Config{})

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	go func() {
		if err := app.Listen(":3004"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()

	log.Println("[INFO] Files service started on :3004")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Shutting donw...")
	app.Shutdown()
}
