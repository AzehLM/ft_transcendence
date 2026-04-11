package workers

import (
	"context"
	"encoding/json"
	"log"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type EventPublisher struct {
	redis	*redis.Client
}

func NewEventPublisher(redis *redis.Client) *EventPublisher {
	return &EventPublisher{redis: redis}
}

func (p *EventPublisher) publish(ctx context.Context, ownerID uuid.UUID, orgID *uuid.UUID, event WSEvent) error {

	var channel string
	if orgID != nil {
		channel = channelOrgEvents + orgID.String()
	} else {
		channel = channelUserEvents + ownerID.String()
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	if err := p.redis.Publish(ctx, channel, payload).Err(); err != nil {
		log.Printf("[EventPublisher] Failed to publish on %s: %v", channel, err) // pas de remonté d'erreur ici c'est OK si ca fail
	}

	return nil
}
