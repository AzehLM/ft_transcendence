package ws

import (
	"context"
	"log"
	"backend/orga/internal/repository"
	"github.com/gofiber/contrib/websocket"
	"github.com/google/uuid"
)

func (h *Hub) GlobalWSHandler(c *websocket.Conn) {

	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	log.Printf("[WS] New user : %s", userID)

	orgas, err := repository.GetMemberOrga(h.DB, userID)
	if err != nil {
		log.Println("[WS] Error get orgas:", err)
		return
	}

	var channels []string
	for _, org := range orgas {
		channels = append(channels, "org_events:"+org.ID.String())
	}

	// ctx := context.Background()
	// pubsub := h.Redis.Subscribe(ctx, channels...)
	// defer pubsub.Close()

	// loop send redis msg and send to client
}