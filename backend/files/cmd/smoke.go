package main

import (
	"log"

	"backend/files/internal"

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
