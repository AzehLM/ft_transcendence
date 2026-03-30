package service

import (
	"context"
	"fmt"
	"time"

	files "backend/storage/internal"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var ErrForbidden = fmt.Errorf("forbidden")
var ErrNotFound = fmt.Errorf("not found")

// business logic contract
type StorageService interface {
	RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error)
	FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error
	DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error)
	DeleteFile(userID uuid.UUID, fileID uuid.UUID) error
	MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error
}

type storageService struct {
	repo        files.StorageRepository
	minioClient *minio.Client
	redis       *redis.Client
}

func NewStorageService(repo files.StorageRepository, minioClient *minio.Client, redis *redis.Client) StorageService {
	return &storageService{
		repo:        repo,
		minioClient: minioClient,
		redis:       redis,
	}
}

/* interface methods*/
func (s *storageService) RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error) {

	ctx := context.TODO()
	objectID = uuid.New()

	// quota verification, a voir avec pierrick
	// if used_space + fileSize > max_space = return 413

	newFile := &files.File{
		ID:             uuid.New(),
		OwnerUserID:    userID,
		OrgID:          orgID,
		FolderID:       folderID,
		Name:           "",
		FileSize:       fileSize,
		MinioObjectKey: objectID,
		EncryptedDEK:   []byte{},
		IV:             []byte{},
		Status:         "PENDING",
	}

	if err = s.repo.InsertPendingFile(newFile); err != nil {
		return "", uuid.Nil, err
	}

	// default ctx for now, ostrom as the root repository, will be be modified depending on users path ?
	rawURL, err := s.minioClient.PresignedPutObject(ctx, "ostrom", objectID.String(), 15*time.Minute)
	if err != nil {
		return "", uuid.Nil, err
	}

	presignedURL = rawURL.String()

	return presignedURL, objectID, err
}

func (s *storageService) FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error {

	// activer ficher en db
    if err := s.repo.ActivateFile(objectID, name, encryptedDEK, iv, orgID, userID); err != nil {
        return err
    }

	// increment used_space -> later
	// publier l'event file_uploaded sur redis -> later

	return nil
}

func (s *storageService) DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error) {

	ctx := context.TODO()

	// gets the file in DB
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

func (s *storageService) DeleteFile(userID uuid.UUID, fileID uuid.UUID) error {

	ctx := context.TODO()

	// gets the file in DB
	file, err := s.repo.FindByID(fileID)
	if err == gorm.ErrRecordNotFound {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	// sort of right check (only owner for now, has to be updated for organizations)
	if file.OwnerUserID != userID {
		return ErrForbidden
	}

	// suppress file metadata in DB
	if err := s.repo.DeleteFile(fileID); err != nil {
		return err
	}

	// suppress actual file in minio
	if err := s.minioClient.RemoveObject(ctx, "ostrom", file.MinioObjectKey.String(), minio.RemoveObjectOptions{}); err != nil {
		return err
	}

	// update de used_space -> later
	// publier event file_deleted sur redis -> later

	return nil
}

func (s *storageService) MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error {

	file, err := s.repo.FindByID(fileID)
	if err == gorm.ErrRecordNotFound {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	if file.OwnerUserID != userID {
		return ErrForbidden
	}

	if err := s.repo.UpdateFileFolder(fileID, folderID); err != nil {
		return err
	}

	return nil
}
