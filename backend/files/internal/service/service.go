package service

import (
	"context"
	"fmt"
	// "log"
	"time"

	files "backend/files/internal"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var ErrForbidden = fmt.Errorf("forbidden")
var ErrNotFound = fmt.Errorf("not found")

// contract pour la logique métier
type FileService interface {
	RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error)
	FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error
	// DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error)
	// DeleteFile(userID uuid.UUID, fileID uuid.UUID) error
	// MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error
}

type fileService struct {
	repo		files.FileRepository
	minioClient	*minio.Client
	redis		*redis.Client
}

func NewFileService(repo files.FileRepository, minioClient *minio.Client, redis *redis.Client) FileService {
	return &fileService{
		repo:			repo,
		minioClient:	minioClient,
		redis:			redis,
	}
}

/*
BODY
{
  "file_size": 2147483648,
  "folder_id": "<uuid_optional>",
  "org_id": "<uuid_optional>"
}
RESPONSE 200
{
  "presigned_url": "https://minio.../bucket/object?X-Amz-...",
  "object_id": "<uuid>"
}
*/
func (s *fileService) RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error) {

    ctx := context.Background()

	objectID = uuid.New()

	// quota verification, a voir avec pierrick
	// if used_space + fileSize > max_space = return 413

	newFile := &files.File{
		ID:				uuid.New(),
		OwnerUserID:	userID,
		OrgID:			orgID,
		FolderID:		folderID,
		Name:			"",
		FileSize:		fileSize,
		MinioObjectKey:	objectID,
		EncryptedDEK:	[]byte{},
		IV:				[]byte{},
		Status:			"PENDING",
	}

	if err = s.repo.InsertPendingFile(newFile); err != nil {
		return "", uuid.Nil, err
	}

	// default ctx for now, not sure it will change, ostrom as the root repository, will have to be modified depending on users path
	rawURL, err := s.minioClient.PresignedPutObject(ctx, "ostrom", objectID.String(), 15*time.Minute)
	if err != nil {
		return "", uuid.Nil, err
	}
	// log.Printf("[LOG] rawURL: %s\n", rawURL)
	presignedURL = rawURL.String()
	// log.Printf("[LOG] presignedURL: %s\n", presignedURL)

	return presignedURL, objectID, err
}


func (s *fileService) FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error {

	// verifier pending status
	file, err := s.repo.FindByObjectID(objectID)
	if err == gorm.ErrRecordNotFound {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	if file.OwnerUserID != userID {
		return ErrForbidden // for future error code
	}

	// activer ficher en db
	if err := s.repo.ActivateFile(objectID, name, encryptedDEK, iv, orgID); err != nil {
		return err
	}

	// increment used_space -> later
	// publier l'event file_uploaded sur redis -> later

	return nil // tout c'est bien passé
}
