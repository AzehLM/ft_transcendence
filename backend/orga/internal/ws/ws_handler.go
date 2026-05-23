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
	defer func() {
		if err := c.Close(); err != nil {
			log.Printf("[WS] Error closing websocket connection: %v", err)
		}
	}()

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
	ctx := context.Background()

	if err := h.Redis.SAdd(ctx, "online_users", userID.String()).Err(); err != nil {
		log.Printf("[WS] Redis SAdd error for user %s: %v", userID, err)
	}

	repo := repository.NewOrganizationRepository(h.DB)
	orgas, err := repo.GetMemberOrga(userID)
	if err != nil {
		log.Println("[WS] Error fetching organizations:", err)
		h.Redis.SRem(ctx, "online_users", userID.String())
		return
	}

	for _, org := range orgas {
		event := WSEvent{
			Event:   "USER_ONLINE",
			OrgID:   org.ID.String(),
			Message: "User is online",
			Data: map[string]string{
				"user_id": userID.String(),
			},
		}
		_ = h.PublishToOrga(ctx, org.ID.String(), event)
	}

	defer func() {
		ctxDel := context.Background()
		if err := h.Redis.SRem(ctxDel, "online_users", userID.String()).Err(); err != nil {
			log.Printf("[WS] Redis SRem error for user %s: %v", userID, err)
		}

		for _, org := range orgas {
			event := WSEvent{
				Event:   "USER_OFFLINE",
				OrgID:   org.ID.String(),
				Message: "User is offline",
				Data: map[string]string{
					"user_id": userID.String(),
				},
			}
			_ = h.PublishToOrga(ctxDel, org.ID.String(), event)
		}
	}()

	channels := make([]string, 0, len(orgas)+1)

	channels = append(channels, "user_events:"+userID.String())

	for _, org := range orgas {
		channels = append(channels, "org_events:"+org.ID.String())
	}
	pubsub := h.Redis.Subscribe(ctx, channels...)

	defer func() {
		if err := pubsub.Close(); err != nil {
			log.Printf("[WS] Error closing Redis pubsub: %v", err)
		}
	}()

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
