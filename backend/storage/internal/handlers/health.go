package handlers

import (
	"context"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db          *gorm.DB
	redis       *redis.Client
	minioClient *minio.Client
}

func NewHealthHandler(db *gorm.DB, redis *redis.Client, minioClient *minio.Client) *HealthHandler {
	return &HealthHandler{
		db:				db,
		redis:			redis,
		minioClient:	minioClient,
	}
}

func (h *HealthHandler) Checker(c fiber.Ctx) error {

	var (
		postgresOK	bool
		redisOK		bool
		minioOK		bool
		mu			sync.Mutex
	)

	ctx, cancel := context.WithTimeout(c.Context(), 3 * time.Second)
	defer cancel()

	var wg sync.WaitGroup
	wg.Go(func() {
		err := h.db.Exec("SELECT 1").Error
		mu.Lock()
		postgresOK = err == nil // true if err == nil, false otherwise
		mu.Unlock()
	})
	wg.Go(func() {
		err := h.redis.Ping(ctx).Err()
		mu.Lock()
		redisOK = err == nil
		mu.Unlock()
	})
	wg.Go(func() {
		_, err := h.minioClient.BucketExists(ctx, "ostrom")
		mu.Lock()
		minioOK = err == nil
		mu.Unlock()
	})

	wg.Wait()

	readiness := postgresOK
	degraded := readiness && (!redisOK || !minioOK)

	status := fiber.StatusOK
	if !readiness {
		status = fiber.StatusServiceUnavailable
	}

	deps := fiber.Map{
		"postgres": postgresOK,
		"redis":    redisOK,
		"minio":    minioOK,
	}

	return c.Status(status).JSON(fiber.Map{
		"service":		"storage",
		"liveness":		true,
		"readiness":	readiness,
		"degraded":		degraded,
		"dependencies":	deps,
	})
}
