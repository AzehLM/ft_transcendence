package workers

import "github.com/redis/go-redis/v9"

type EventPublisher struct {
	redis	*redis.Client
}

func NewEventPublisher(redis *redis.Client) *EventPublisher {
	return &EventPublisher{redis: redis}
}
