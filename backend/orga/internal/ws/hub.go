package ws

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"sync"
	"github.com/gofiber/contrib/websocket"
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