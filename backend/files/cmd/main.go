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

	found, err = repo.FindByID(pending.ID)
	if err != nil {
		log.Printf("[SMOKE] FAIL FindByID: %v", err)
		return
	}
	log.Printf("[SMOKE] OK  FindByID → name=%s id=%s\n", found.Name, found.ID)

    if err := repo.ActivateFile(objectID, "real-name.enc", []byte("real-dek"), []byte("real-iv-16bytes!"), nil); err != nil {
        log.Printf("[SMOKE] FAIL ActivateFile: %v", err)
        return
    }
    log.Println("[SMOKE] OK  ActivateFile")

	// needs a real test and not nil, I'm not sure how to do it atm
	if err := repo.UpdateFileFolder(pending.ID, nil); err != nil {
		log.Printf("[SMOKE] FAIL UpdateFileFolder: %v", err)
	}
	log.Println("[SMOKE] OK  UpdateFileFolder")

	if err := repo.DeleteFile(objectID); err != nil {
		log.Printf("[SMOKE] FAIL DeleteFile: %v\n", err)
		return
	}
	log.Println("[SMOKE] OK  DeleteFile")
    log.Println("[SMOKE] All checks passed ✓")
}

func main() {

	env, err := config.LoadEnv()
	if (err != nil) {
		log.Fatalf("[FATAL], Failed to load configuration: %v", err)
	}

	minioUser, err := config.ReadSecret("minio_admin_user")
	if err != nil {
		log.Fatalf("[FATAL] Could not read MinIO user secret: %v", err)
	}

	minioPassword, err := config.ReadSecret("minio_admin_pwd")
	if err != nil {
		log.Fatalf("[FATAL] Could not read MinIO password secret: %v", err)
	}

	// true in prod ? (http vs https, to talk with the minio server)
	// since the communication is always via the docker network, I'm not sure we need to make it true in prod but I'll have to check further is that is really a concern
	useSSL := false
	minioEndpoint := "minio:9000"

	minioClient, err := files.NewMinioClient(minioEndpoint, minioUser, minioPassword, useSSL)
	if err != nil {
		log.Fatalf("[FATAL] MinIO client init failed: %v\n", err)
	}

	log.Printf("[INFO] minioClient: %#v\n", minioClient)
	// log.Printf("[INFO] MinIO client initialized")

	database := db.InitDB(env)

	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("[FATAL] Could not get underlying DB: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("[FATAL] DB unreachable: %v", err)
	}
	log.Println("[INFO] DB connection OK")

	// repo := files.NewFileRepository(database)
	// runSmokeTest(database, repo)

	app := fiber.New(fiber.Config{})

	go func() {
		if err := app.Listen(":8083"); err != nil {
			log.Fatalf("[FATAL] Server error: %v", err)
		}
	}()


	// to follow Lou-Anne comments on self-contained handlers (to keep routes definition clean):
	// minioClient := minio.New(...)
	// repo := files.NewFileRepository(database) // I already have this a bit further up
	// service := files.NewService(repo, minioClient)
	// handler := files.NewFileHandler(service)

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
