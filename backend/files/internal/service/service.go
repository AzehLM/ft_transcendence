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
	DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error)
	DeleteFile(userID uuid.UUID, fileID uuid.UUID) error
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

func (s *fileService) DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error) {

	ctx := context.Background()

	// recuperer le ficher en db -> si non trouver ErrNotFound
	file, err := s.repo.FindByID(fileID)
	if err == gorm.ErrRecordNotFound {
		return "", nil, nil, "", ErrNotFound
	} else if err != nil {
		return "", nil, nil, "", err
	}

	// RBAC -> later

	// https://docs.min.io/enterprise/aistor-object-store/developers/sdk/go/api/#presignedgetobjectctx-contextcontext-bucketname-objectname-string-expiry-timeduration-reqparams-urlvalues-urlurl-error
	// generate presigned URL (GET)
	rawURL, err := s.minioClient.PresignedGetObject(ctx, "ostrom", file.MinioObjectKey.String(), 5*time.Minute, nil)
	if err != nil {
		return "", nil, nil, "", err
	}
	presignedURL = rawURL.String()

	return presignedURL, file.EncryptedDEK, file.IV, file.Name, nil
}

func (s *fileService) DeleteFile(userID uuid.UUID, fileID uuid.UUID) error {

	ctx := context.Background()
	// recuperer le ficher en db -> si non trouvé ErrNotFound
	file, err := s.repo.FindByID(fileID)
	if err == gorm.ErrRecordNotFound {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	// verifier les droits -> si pas les droits ErrForbidden
	if file.OwnerUserID != userID {
		return ErrForbidden
	}
	// supprimer en DB
	if err := s.repo.DeleteFile(fileID); err != nil {
		return err
	}
	// supprimer le fichier via le minioClient
	if err := s.minioClient.RemoveObject(ctx, "ostrom", file.MinioObjectKey.String(), minio.RemoveObjectOptions{}); err != nil {
		return err
	}

	// update de used_space -> later
	// publier event file_deleted sur redis -> later

	return nil
}
