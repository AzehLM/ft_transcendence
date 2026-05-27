package ws

import (
	"backend/orga/internal/repository"
	"context"
	"encoding/json"
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

	connID := uuid.New().String()
	userSessionsKey := "user_sessions:" + userID.String()

	if err := h.Redis.SAdd(ctx, userSessionsKey, connID).Err(); err != nil {
		log.Printf("[WS] Redis SAdd session error for user %s: %v", userID, err)
	}

	isFirst, err := h.Redis.SAdd(ctx, "online_users", userID.String()).Result()
	if err != nil {
		log.Printf("[WS] Redis SAdd online_users error for user %s: %v", userID, err)
		isFirst = 0
	}

	repo := repository.NewOrganizationRepository(h.DB)
	orgas, err := repo.GetMemberOrga(userID)
	if err != nil {
		log.Println("[WS] Error fetching organizations:", err)
		_ = h.Redis.SRem(ctx, userSessionsKey, connID).Err()
		if isFirst == 1 {
			remConns, remErr := h.Redis.SCard(ctx, userSessionsKey).Result()
			if remErr == nil && remConns == 0 {
				_ = h.Redis.SRem(ctx, "online_users", userID.String()).Err()
			}
		}
		return
	}

	orgNames := make(map[string]string, len(orgas))
	for _, org := range orgas {
		orgNames[org.ID.String()] = org.Name
	}

	if isFirst == 1 {
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
	}

	defer func() {
		ctxDel := context.Background()
		if err := h.Redis.SRem(ctxDel, userSessionsKey, connID).Err(); err != nil {
			log.Printf("[WS] Redis SRem session error for user %s: %v", userID, err)
		}

		remConns, remErr := h.Redis.SCard(ctxDel, userSessionsKey).Result()
		if remErr != nil {
			log.Printf("[WS] Redis SCard error for user %s on disconnect: %v", userID, remErr)
			return
		}

		if remConns == 0 {
			removed, err := h.Redis.SRem(ctxDel, "online_users", userID.String()).Result()
			if err != nil {
				log.Printf("[WS] Redis SRem error for user %s: %v", userID, err)
				removed = 0
			}

			if removed == 1 {
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
			}
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

			payloadBytes := h.enrichEventMessage([]byte(msg.Payload), orgNames)

			err := c.WriteMessage(websocket.TextMessage, payloadBytes)
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

func (h *Hub) enrichEventMessage(payload []byte, orgNames map[string]string) []byte {
	var raw map[string]interface{}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return payload
	}

	eventType, _ := raw["type"].(string)
	if eventType == "" {
		eventType, _ = raw["event"].(string)
	}

	data, ok := raw["data"].(map[string]interface{})
	if !ok {
		return payload
	}

	orgIDStr, _ := data["org_id"].(string)
	if orgIDStr == "" {
		return payload
	}

	var orgName string
	if eventType == "ORGA_RENAMED" {
		if newOrgName, ok := data["new_name"].(string); ok && newOrgName != "" {
			orgName = newOrgName
			orgNames[orgIDStr] = newOrgName
		}
	} else if eventType == "ORGA_DELETED" {
		if deletedOrgName, ok := data["org_name"].(string); ok && deletedOrgName != "" {
			orgName = deletedOrgName
		}
	}

	if orgName == "" {
		var found bool
		orgName, found = orgNames[orgIDStr]
		if !found {
			err := h.DB.Table("organizations").Select("name").Where("id = ?", orgIDStr).Row().Scan(&orgName)
			if err != nil {
				orgName = "Unknown Organization"
			}
			orgNames[orgIDStr] = orgName
		}
	}

	var enrichedMsg string

	switch eventType {
	case "file_uploaded":
		enrichedMsg = fmt.Sprintf("[%s] A new file has been uploaded", orgName)
	case "file_deleted":
		enrichedMsg = fmt.Sprintf("[%s] A file has been deleted", orgName)
	case "folder_created":
		enrichedMsg = fmt.Sprintf("[%s] A new folder has been created", orgName)
	case "folder_deleted":
		enrichedMsg = fmt.Sprintf("[%s] A folder has been deleted", orgName)
	case "folder_renamed":
		enrichedMsg = fmt.Sprintf("[%s] A folder has been renamed", orgName)
	case "ORGA_RENAMED":
		oldName, _ := data["old_name"].(string)
		if oldName == "" {
			oldName = "Organization"
		}
		enrichedMsg = fmt.Sprintf("%s has been renamed to %s", oldName, orgName)
	case "ORGA_DELETED":
		enrichedMsg = fmt.Sprintf("Organization %s has been permanently deleted", orgName)
	default:
		return payload
	}

	raw["message"] = enrichedMsg
	data["org_name"] = orgName
	raw["data"] = data

	enrichedPayload, err := json.Marshal(raw)
	if err != nil {
		return payload
	}
	return enrichedPayload
}
