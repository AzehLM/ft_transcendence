package ws

import (
	"backend/orga/internal/repository"
	"context"
	"fmt"
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/google/uuid"
)

func (h *Hub) GlobalWSHandler(c *websocket.Conn) {
	defer c.Close()

	userIDRaw := c.Locals("user_id")
	if userIDRaw == nil {
		log.Println("[WS] Missing user_id in websocket context")
		return
	}

	userIDStr, ok := userIDRaw.(string)
	if !ok {
		userIDStr = fmt.Sprint(userIDRaw)
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Printf("[WS] Invalid user_id %q: %v", userIDStr, err)
		return
	}

	log.Printf("[WS] New user: %s", userID)

	orgas, err := repository.GetMemberOrga(h.DB, userID)
	if err != nil {
		log.Println("[WS] Error fetching organizations:", err)
		return
	}

	channels := make([]string, 0, len(orgas))
	for _, org := range orgas {
		channels = append(channels, "org_events:"+org.ID.String())
	}
	if len(channels) == 0 {
		log.Printf("[WS] User %s has no organizations, closing websocket", userID)
		return
	}

	ctx := context.Background()
	pubsub := h.Redis.Subscribe(ctx, channels...)

	defer pubsub.Close()

	if _, err := pubsub.Receive(ctx); err != nil {
		log.Printf("[WS] Redis subscribe error for %s: %v", userID, err)
		return
	}

	ch := pubsub.Channel()

	log.Printf("[WS] User %s listening to %d organizations", userID, len(channels))

	for msg := range ch {

		err := c.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
		if err != nil {
			log.Printf("[WS] Lost connection with %s: %v", userID, err)
			break
		}
	}
}
