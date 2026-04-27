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

func (p *EventPublisher) PublishOrgDeleted(ctx context.Context, orgID uuid.UUID) error {
	return p.redis.XAdd(ctx, &redis.XAddArgs{
		Stream:	"events:domain:org_deleted",
		ID:		"*",
		Values: map[string]interface{}{
			"org_id":			orgID.String(),
			"deleted_at":		time.Now(),
		},
	}).Err()
}
