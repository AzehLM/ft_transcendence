package storage

import (
	"context"
	"fmt"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func NewMinioClient(endpoint, user, password string, useSSL bool) (*minio.Client, error) {
	return minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(user, password, ""),
		Secure: useSSL,
	})
}

// creating a global bucket
func InitMinioBucket(client *minio.Client, bucketName string) error {
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucketName)

	if err != nil {
		return fmt.Errorf("BucketExists failed: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("MakeBucket failed: %w", err)
		}
		log.Printf("[INFO] Bucket created: %s\n", bucketName)
	} else {
		log.Printf("[INFO] Bucket already exists: %s\n", bucketName)
	}
	return nil
}
