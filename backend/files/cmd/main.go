package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"backend/files/internal" // Pour NewFileRepository()
	"backend/shared/config"  // Pour LoadEnv() et ReadSecret depuis shared/config
	"backend/shared/db"      // Pour InitDB() depuis shared/db

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func runSmokeTest(db *gorm.DB, repo files.FileRepository) {

    log.Println("[SMOKE] Starting repository smoke test...")

    db.Exec("SET session_replication_role = replica")
    defer db.Exec("SET session_replication_role = DEFAULT")

    ownerID := uuid.New()
	objectID := uuid.New()

    pending := &files.File{
        ID:             uuid.New(),
        OwnerUserID:    ownerID,
        Name:           "smoke-test.enc",
        FileSize:       1024,
        MinioObjectKey: objectID,
        EncryptedDEK:   []byte("fake-dek"),
        IV:             []byte("fake-iv-16bytes!"),
        Status:         "PENDING",
    }

    if err := repo.InsertPendingFile(pending); err != nil {
        log.Printf("[SMOKE] FAIL InsertPendingFile: %v", err)
        return
    }
    log.Println("[SMOKE] OK  InsertPendingFile")

    found, err := repo.FindByObjectID(objectID)
    if err != nil {
        log.Printf("[SMOKE] FAIL FindByObjectID: %v", err)
        return
    }
    log.Printf("[SMOKE] OK  FindByObjectID → name=%s status=%s", found.Name, found.Status)

    if err := repo.ActivateFile(objectID, "real-name.enc", []byte("real-dek"), []byte("real-iv-16bytes!"), nil); err != nil {
        log.Printf("[SMOKE] FAIL ActivateFile: %v", err)
        return
    }
    log.Println("[SMOKE] OK  ActivateFile")

    log.Println("[SMOKE] Missing smoke test for\n- FindByID\n- DeleteFile\n- UpdateFileFolder")
    // log.Println("[SMOKE] All checks passed ✓")
}

func main() {

	env, err := config.LoadEnv()
	if (err != nil) {
		log.Fatalf("[FATAL], Failed to load configuration: %v", err)
	}

	log.Printf("[INFO] env values: %s | %s | %s\n", env.PostgresDBname, env.PostgresHost, env.PostgresPort)

	minioUser, err := config.ReadSecret("minio_admin_user")
	if err != nil {
		log.Fatalf("[FATAL] Could not read MinIO user secret: %v", err)
	}

	minioPassword, err := config.ReadSecret("minio_admin_pwd")
	if err != nil {
		log.Fatalf("[FATAL] Could not read MinIO password secret: %v", err)
	}

	log.Printf("[INFO] minio credentials: %s | %s\n", minioUser, minioPassword)

	database := db.InitDB(env)

	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("[FATAL] Could not get underlying DB: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("[FATAL] DB unreachable: %v", err)
	}
	log.Println("[INFO] DB connection OK")

	repo := files.NewFileRepository(database)
	runSmokeTest(database, repo)

	app := fiber.New(fiber.Config{})

	go func() {
		if err := app.Listen(":8083"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()

	log.Println("[INFO] Files service started on :8083")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Shutting down...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("[ERROR] Failed to shutdown Fiber: %v", err)
	}

	log.Println("[INFO] Server stopped successfully.")
}
