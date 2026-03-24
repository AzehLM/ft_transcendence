package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/internal/config"
	"backend/internal/files"


	"github.com/gofiber/fiber/v3"
)

func main() {
	// config pas declarer (réutilisé ce que Pierrick a fait ?)
	env, err := config.LoadEnv()
	if (err != nil) {
		log.Fatalf("[FATAL], Failed to load configuration: %v", err)
	}

	// meme chose pour db
	database := db.InitDB(env)

	// faut compiler avant de pouvoir tester...
	// fileRep := files.NewFileRepository(database)

	app := fiber.New(fiber.Config{})

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	go func() {
		if err := app.Listen(":8089"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()

	log.Println("[INFO] Files service started on :8089")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Shutting donw...")
	app.Shutdown()
}
