package workers

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type EventPublisher struct {
	redis	*redis.Client
}

func NewEventPublisher(redis *redis.Client) *EventPublisher {
	return &EventPublisher{redis: redis}
}

func (p *EventPublisher) PublishUserDeleted(ctx context.Context, userID uuid.UUID) error {
	return p.redis.XAdd(ctx, &redis.XAddArgs{
		Stream:	"events:domain:user_deleted",
		ID:		"*",
		Values: map[string]interface{}{
			"user_id":			userID.String(),
			"deleted_at":		time.Now(),
		},
	}).Err()
}
