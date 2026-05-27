package workers

import (
	"context"
	"encoding/json"
	"log"
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

func (p *EventPublisher) PublishUserProfileUpdated(ctx context.Context, userID uuid.UUID, orgIDs []string, firstName, familyName string) error {
	type WSEvent struct {
		Event   string      `json:"event"`
		Message string      `json:"message"`
		Data    interface{} `json:"data,omitempty"`
	}

	event := WSEvent{
		Event:   "USER_PROFILE_UPDATED",
		Message: "User profile has been updated",
		Data: map[string]interface{}{
			"user_id":     userID.String(),
			"first_name":  firstName,
			"family_name": familyName,
		},
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	err = p.redis.Publish(ctx, "user_events:"+userID.String(), payload).Err()
	if err != nil {
		log.Printf("[EventPublisher] Error publishing profile update to user_events:%s: %v", userID, err)
		return err
	}

	for _, orgID := range orgIDs {
		err = p.redis.Publish(ctx, "org_events:"+orgID, payload).Err()
		if err != nil {
			log.Printf("[EventPublisher] Error publishing profile update to org_events:%s: %v", orgID, err)
			return err
		}
	}

	return nil
}

