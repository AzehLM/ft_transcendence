package service

import (
	"context"
	"errors"
	"strings"
	"time"

	files "backend/storage/internal"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var ErrForbidden = errors.New("forbidden")
var ErrNotFound = errors.New("not found")
var ErrQuotaExceeded = errors.New("quota exceeded") // for when I'll be able to check quota

// business logic contract
type StorageService interface {
	// File part
	RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error)
	FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) (uuid.UUID, error)
	DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error)
	DeleteFile(userID uuid.UUID, fileID uuid.UUID) error
	MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error
	GetFileInfo(userID uuid.UUID, fileID uuid.UUID) (file *files.File, err error)
	// Folder part
}

type storageService struct {
	repo        files.StorageRepository
	minioClient *minio.Client
	redis       *redis.Client
	db			*gorm.DB
}

func NewStorageService(repo files.StorageRepository, minioClient *minio.Client, redis *redis.Client, db *gorm.DB) StorageService {
	return &storageService{
		repo:        	repo,
		minioClient:	minioClient,
		redis:			redis,
		db:				db, // pour l'instant je garde mais pas sur que j'utilise
	}
}

/* interface methods*/
func (s *storageService) RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error) {

	ctx := context.TODO()
	objectID = uuid.New()

	var used, max int64
	used, max, err = s.repo.GetUserSpace(userID)
	if err != nil {
		return "", uuid.Nil, err
	}

	if used + fileSize > max {
		return "", uuid.Nil, ErrQuotaExceeded
	}

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

	presignedURL = strings.Replace(rawURL.String(), "http://minio:9000", "https://localhost:4242/storage", 1)

	return presignedURL, objectID, err
}

func (s *storageService) FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) (uuid.UUID, error) {

	file, err := s.repo.FindByObjectID(objectID)
	if err != nil {
		return uuid.Nil, err
	}

	// activer ficher en db
	if err := s.repo.ActivateFile(objectID, name, encryptedDEK, iv, orgID, userID); err != nil {
		return uuid.Nil, err
	}


	// incrementation en DB avec un UPDATE users SET used_space = used_space + ? WHERE id = ? pour évité les dataraces
	var ok bool
	ok, err = s.repo.TryIncrementUserUsedSpace(userID, file.FileSize)
	if err != nil {
		return uuid.Nil, err
	}

	if !ok {
		// TODO(redis): `file_orphaned` event with {object_key, file_id} (stream)
		// so the cleanup worker removes the MinIO blob and the PENDING row
		// Until the event bus is wired, quota-rejected uploads leave an orphan blob + PENDING row
		return uuid.Nil, ErrQuotaExceeded
	}
	// TODO(redis): event with file_uploaded (pub/sub)

	return file.ID, nil
}

func (s *storageService) DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error) {

	ctx := context.TODO()

	// gets the file in DB
	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, nil, "", ErrNotFound
	} else if err != nil {
		return "", nil, nil, "", err
	}

	// RBAC -> later
	if file.OwnerUserID != userID {
		return "", nil, nil, "", ErrForbidden
	}

	// https://docs.min.io/enterprise/aistor-object-store/developers/sdk/go/api/#presignedgetobjectctx-contextcontext-bucketname-objectname-string-expiry-timeduration-reqparams-urlvalues-urlurl-error
	// generate presigned URL (GET)
	rawURL, err := s.minioClient.PresignedGetObject(ctx, "ostrom", file.MinioObjectKey.String(), 5*time.Minute, nil)
	if err != nil {
		return "", nil, nil, "", err
	}

	presignedURL = strings.Replace(rawURL.String(), "http://minio:9000", "https://localhost:4242/storage", 1)

	return presignedURL, file.EncryptedDEK, file.IV, file.Name, nil
}

func (s *storageService) DeleteFile(userID uuid.UUID, fileID uuid.UUID) error {

	ctx := context.TODO()

	// gets the file in DB
	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
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

	if err := s.repo.DecrementUserUsedSpace(userID, file.FileSize); err != nil {
		return err
	}
	// publier event file_deleted sur redis -> later (pub/sub)

	return nil
}

func (s *storageService) MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error {

	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	if file.OwnerUserID != userID {
		return ErrForbidden
	}

	rows, err := s.repo.UpdateFileFolder(fileID, folderID)
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *storageService) GetFileInfo(userID uuid.UUID, fileID uuid.UUID) (file *files.File, err error) {

	file, err = s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	if file.OwnerUserID != userID {
		return nil, ErrForbidden
	}

	return file, nil
}
