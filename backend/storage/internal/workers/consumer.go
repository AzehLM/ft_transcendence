package workers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	storage "backend/storage/internal"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
)

type EventConsumer struct {
	repo		storage.StorageRepository
	minioClient	*minio.Client
}

func NewEventConsumer(repo storage.StorageRepository, minioClient *minio.Client) *EventConsumer {
	return &EventConsumer{
		repo:			repo,
		minioClient:	minioClient,
	}
}

func (c *EventConsumer) ConsumeFileOrphaned(ctx context.Context, rdb *redis.Client) {
	const (
		stream    = "events:domain:file_orphaned"
		group     = "storage-workers"
	)

	for {
		entries, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    group,
			Streams:  []string{stream, ">"}, // ">" makes the function read only events that have not been read yet
			Count:    10,
			Block:    5 * time.Second, // latency between each Read. For comparision it is an equivalent to the last parameter of epoll_wait(..., timeout)
		}).Result()

		if err != nil {
			if errors.Is(err, redis.Nil) {
				continue
			}
			if errors.Is(err, context.Canceled) {
				log.Println("[INFO] ConsumeFileOrphaned: context cancelled, stopping")
				return
			}
			log.Printf("[ERROR] ConsumeFileOrphaned: XREADGROUP error: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}

		for _, entry := range entries[0].Messages {
			if err := c.handleFileOrphaned(ctx, rdb, entry, stream, group); err != nil {
				log.Printf("[ERROR] ConsumeFileOrphaned: failed to handle message %s: %v", entry.ID, err)
			}
		}
	}
}

func (c *EventConsumer) handleFileOrphaned(ctx context.Context, rdb *redis.Client, msg redis.XMessage, stream, group string) error {

	fileIDStr, ok := msg.Values["file_id"].(string)
	if !ok {
		log.Printf("[WARN] file_orphaned: missing file_id in message %s", msg.ID)
		// incorrect message format, we aknowledge to avoid blocking the stream
		rdb.XAck(ctx, stream, group, msg.ID)
		return nil
	}

	minioKeyStr, ok := msg.Values["minio_object_key"].(string)
	if !ok {
		log.Printf("[WARN] file_orphaned: missing minio_object_key in message %s", msg.ID)
		rdb.XAck(ctx, stream, group, msg.ID)
		return nil
	}

	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		log.Printf("[WARN] file_orphaned: invalid file_id %s: %v", fileIDStr, err)
		rdb.XAck(ctx, stream, group, msg.ID)
		return nil
	}

	// same order, delete in DB first then minio object
	if err := c.repo.DeleteFile(fileID); err != nil {
		return fmt.Errorf("DeleteFile %s: %w", fileID, err)
	}

	if err := c.minioClient.RemoveObject(ctx, "ostrom", minioKeyStr, minio.RemoveObjectOptions{}); err != nil {
		// DB row already deleted, blob is now a true orphan in MinIO
		// next periodic sweep will clean it up
		log.Printf("[WARN] file_orphaned: DB cleaned but MinIO removal failed for %s: %v", minioKeyStr, err)
		rdb.XAck(ctx, stream, group, msg.ID)
		return nil
	}

	// aknowledgment when everything has been working properly
	if err := rdb.XAck(ctx, stream, group, msg.ID).Err(); err != nil {
		log.Printf("[WARN] file_orphaned: XACK failed for %s: %v", msg.ID, err)
	}

	log.Printf("[INFO] file_orphaned: cleaned up file %s (minio key: %s)", fileID, minioKeyStr)
	return nil
}
