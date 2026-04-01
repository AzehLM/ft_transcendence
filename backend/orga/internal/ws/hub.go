package ws

import (
	"sync"

	"context"
	"encoding/json"
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Hub struct {
	Redis   *redis.Client
	DB      *gorm.DB
	Clients map[*websocket.Conn]string
	Mu      sync.RWMutex
}

func NewHub(redisClient *redis.Client, db *gorm.DB) *Hub {
	return &Hub{
		Redis:   redisClient,
		DB:      db,
		Clients: make(map[*websocket.Conn]string),
	}
}

type WSEvent struct {
	Type    string      `json:"type"` // ex: MEMBER_ADDED, FILE_UPLOADED
	OrgID   string      `json:"org_id,omitempty"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func (h *Hub) PublishToOrga(ctx context.Context, orgID string, event WSEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("[WS] Erreur Marshal JSON: %v", err)
		return err
	}

	channel := "org_events:" + orgID
	err = h.Redis.Publish(ctx, channel, payload).Err()
	if err != nil {
		log.Printf("[WS] Erreur Publish Redis sur %s: %v", channel, err)
		return err
	}

	return nil
}
