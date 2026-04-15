package ws

import (
	"backend/orga/internal/repository"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
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

	repo := repository.NewOrganizationRepository(h.DB)
	orgas, err := repo.GetMemberOrga(userID)
	if err != nil {
		log.Println("[WS] Error fetching organizations:", err)
		return
	}

	channels := make([]string, 0, len(orgas)+1)

	channels = append(channels, "user_events:"+userID.String())

	for _, org := range orgas {
		channels = append(channels, "org_events:"+org.ID.String())
	}

	ctx := context.Background()
	pubsub := h.Redis.Subscribe(ctx, channels...)

	defer pubsub.Close()

	if _, err := pubsub.Receive(ctx); err != nil {
		log.Printf("[WS] Redis subscribe error for %s: %v", userID, err)
		return
	}

	ch := pubsub.Channel()

	done := make(chan struct{}) // "Kill switch"

	go func() {
		defer close(done)

		for {
			// If the user closes the tab, ReadMessage will return an error!
			_, _, err := c.ReadMessage()
			if err != nil {
				log.Printf("[WS] Disconnection or signal loss for user %s", userID)
				break
			}
		}
	}()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			log.Printf("[WS] Cleanup of session for %s completed.", userID)
			return // defer (c.Close() and pubsub.Close())

		case msg, ok := <-ch:
			if !ok || msg == nil {
				log.Printf("[WS]  Redis PubSub close for user %s.", userID)
				return
			}

			err := c.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			if err != nil {
				return
			}
		case <-ticker.C:
			if err := c.WriteControl(websocket.PingMessage, nil, time.Now().Add(10*time.Second)); err != nil {
				log.Printf("[WS] Erreur Ping, client déconnecté: %v", err)
				return
			}
		}
	}
}
