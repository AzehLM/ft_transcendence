package handlers

import (
	"context"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db          *gorm.DB
	redis       *redis.Client
}

func NewHealthHandler(db *gorm.DB, redis *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:				db,
		redis:			redis,
	}
}

func (h *HealthHandler) Checker(c fiber.Ctx) error {

	var (
		postgresOK	bool
		redisOK		bool
		mu			sync.Mutex
	)

	ctx, cancel := context.WithTimeout(c.Context(), 3 * time.Second)
	defer cancel()

	var wg sync.WaitGroup
	wg.Go(func() {
		err := h.db.Exec("SELECT 1").Error
		mu.Lock()
		postgresOK = err == nil
		mu.Unlock()
	})
	wg.Go(func() {
		err := h.redis.Ping(ctx).Err()
		mu.Lock()
		redisOK = err == nil
		mu.Unlock()
	})

	wg.Wait()

	readiness := postgresOK
	degraded := readiness && !redisOK

	status := fiber.StatusOK
	if !readiness {
		status = fiber.StatusServiceUnavailable
	}

	deps := fiber.Map{
		"postgres": postgresOK,
		"redis":    redisOK,
	}

	return c.Status(status).JSON(fiber.Map{
		"service":		"storage",
		"liveness":		true,
		"readiness":	readiness,
		"degraded":		degraded,
		"dependencies":	deps,
	})
}
