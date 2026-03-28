package service

import (
	"context"
	"net/url"
	"time"

	files "backend/files/internal"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
)

// contract pour la logique métier
type FileService interface {
	RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error)
	// FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error
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

	objectID := uuid.New()

	// quota verification, a voir avec pierrick

	temp := &files.File{
		ID:	uuid.New(),
		// ...
	}

	s.repo.InsertPendingFile(temp)

	s.minioClient.PresignedPutObject(ctx context.Context, bucketName string, objectName string, expires time.Duration)
	// return
}
