package service

import (
	"context"
	"errors"
	"strings"
	"time"

	files "backend/storage/internal"

	"backend/storage/internal/workers"
	"backend/shared/rbac"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"gorm.io/gorm"
)

var (
	ErrForbidden = errors.New("forbidden")
	ErrNotFound = errors.New("not found")
	ErrQuotaExceeded = errors.New("quota exceeded")
)

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
	repo		files.StorageRepository
	minioClient	*minio.Client
	publisher	*workers.EventPublisher
	rbac		rbac.Checker
}

func NewStorageService(repo files.StorageRepository, minioClient *minio.Client, publisher *workers.EventPublisher, checker rbac.Checker) StorageService {
	return &storageService{
		repo:			repo,
		minioClient:	minioClient,
		publisher:		publisher,
		rbac:			checker,
	}
}

/* interface methods*/
func (s *storageService) RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error) {

	if err := s.rbac.CanCreateInFolder(userID, folderID, orgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return "", uuid.Nil, ErrForbidden
		}
		if errors.Is(err, rbac.ErrNotFound) {
			return "", uuid.Nil, ErrNotFound
		}
		return "", uuid.Nil, err
	}

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
	// _ because we ignore the return value of this call (fire-and-forget event)
	_ = s.publisher.PublishFileUploaded(context.TODO(), file)

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

	if err := s.rbac.CanReadFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return "", nil, nil, "", ErrForbidden
		}
		return "", nil, nil, "", err
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

	if err := s.rbac.CanWriteFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		return err
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
	_ = s.publisher.PublishFileDeleted(context.TODO(), file)

	return nil
}

func (s *storageService) MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error {

	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	oldFolderID := file.FolderID

	if err := s.rbac.CanWriteFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		return err
	}

	if err := s.rbac.CanCreateInFolder(userID, folderID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		if errors.Is(err, rbac.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}

	rows, err := s.repo.UpdateFileFolder(fileID, folderID)
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrNotFound
	}

	_ = s.publisher.PublishFileMoved(context.TODO(), file, oldFolderID)

	return nil
}

func (s *storageService) GetFileInfo(userID uuid.UUID, fileID uuid.UUID) (file *files.File, err error) {

	file, err = s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	if err := s.rbac.CanReadFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return nil, ErrForbidden
		}
		return nil, err
	}

	if err := s.rbac.CanReadFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return nil, ErrForbidden
		}
		return nil, err
	}

	return file, nil
}
