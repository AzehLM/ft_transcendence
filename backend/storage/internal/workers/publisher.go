package workers

import "github.com/redis/go-redis/v9"

type EventPublisher struct {

}

type eventPublisher struct {
	redis *redis.Client
}

func NewEventPublisher(redis *redis.Client) EventPublisher {
	return &eventPublisher{redis: redis}
}
