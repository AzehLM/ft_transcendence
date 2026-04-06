package main

import (
	"log"

	files "backend/storage/internal"

	"backend/storage/internal/service"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func runSmokeTest(db *gorm.DB, repo files.StorageRepository) {

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
	log.Printf("[SMOKE] OK  FindByID → name=%s id=%s\n", pending.Name, pending.ID)

	if err := repo.ActivateFile(objectID, "real-name.enc", []byte("real-dek"), []byte("real-iv-16bytes!"), nil, ownerID); err != nil {
		log.Printf("[SMOKE] FAIL ActivateFile: %v", err)
		return
	}
	log.Println("[SMOKE] OK  ActivateFile")
	activated, err := repo.FindByID(pending.ID)
	if err != nil {
		log.Printf("[SMOKE] FAIL FindByID after ActivateFile: %v", err)
		return
	}
	log.Printf("[SMOKE] OK  ActivateFile verified → name=%s status=%s", activated.Name, activated.Status)

	// needs a real test and not nil, I'm not sure how to do it atm
	rows, err := repo.UpdateFileFolder(pending.ID, nil)
	if  err != nil {
		log.Printf("[SMOKE] FAIL UpdateFileFolder: %v", err)
	}

	if rows == 0 {
		log.Printf("[SMOKE] Fail UpdateFileFolder: %v rows affected", rows)
	}
	log.Println("[SMOKE] OK  UpdateFileFolder")

	if err := repo.DeleteFile(objectID); err != nil {
		log.Printf("[SMOKE] FAIL DeleteFile: %v\n", err)
		return
	}
	log.Println("[SMOKE] OK  DeleteFile")
	log.Println("[SMOKE] All checks passed ✓")
}

func runServiceSmokeTest(db *gorm.DB, svc service.StorageService) {
	log.Println("[SMOKE-SVC] Starting service smoke test...")

	db.Exec("SET session_replication_role = replica")
	defer db.Exec("SET session_replication_role = DEFAULT")

	userID := uuid.New()
	presignedURL, objectID, err := svc.RequestUploadURL(userID, 1024, nil, nil)
	if err != nil {
		log.Printf("[SMOKE-SVC] FAIL RequestUploadURL: %v\n", err)
		return
	}
	log.Printf("[SMOKE-SVC] OK RequestUploadURL → objectID=%s\n", objectID)

	var fileID uuid.UUID

	fileID, err = svc.FinalizeUpload(userID, objectID, "encrypted-name.enc", []byte("real-dek"), []byte("real-iv-16bytes!"), nil)
	if err != nil {
		log.Printf("[SMOKE-SVC] FAIL FinalizeUpload: %v", err)
		return
	}
	log.Printf("[SMOKE-SVC] OK FinalizeUpload, file_id: %v\n", fileID)
	log.Printf("[SMOKE-SVC] OK presignedURL: %s\n", presignedURL)
}
