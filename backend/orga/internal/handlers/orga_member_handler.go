package handlers

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"backend/orga/internal/models"
	"backend/orga/internal/repository"
	"backend/orga/internal/ws"
	"encoding/base64"
	"errors"
	"log"
	"strings"
)

func (h *OrgaHandler) CreateOrgaMember(c fiber.Ctx) error {
	var body struct {
		Email             string `json:"user_email"`
		EncOrgaPrivateKey string `json:"enc_org_priv_key"`
		EncAesKey         string `json:"enc_aes_key"`
		Iv                string `json:"iv"`
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request body is empty",
		})
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if body.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "user email required",
		})
	}

	if body.EncOrgaPrivateKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "encrypted org private key required",
		})
	}

	if body.EncAesKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "encrypted aes key is required",
		})
	}
	if body.Iv == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "iv is required",
		})
	}

	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	// check if added user exist
	var user models.User
	repo := repository.NewOrganizationRepository(h.DB)
	userErr := repo.GetUserByEmail(body.Email, &user)
	if userErr != nil {
		if errors.Is(userErr, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": userErr.Error()})
	}

	// check if user already is part of orga
	var member models.OrgaMember
	memberErr := repo.GetOrgaMember(orgID, user.ID, &member)
	if memberErr == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user is already part of the organization"})
	}

	if !errors.Is(memberErr, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": memberErr.Error()})
	}

	decodedKey, errKey := base64.StdEncoding.DecodeString(body.EncOrgaPrivateKey)
	if errKey != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid base64 encrypted private key",
		})
	}

	decodedAesKey, errAes := base64.StdEncoding.DecodeString(body.EncAesKey)
	if errAes != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid base64 aes key",
		})
	}

	decodedIv, errIv := base64.StdEncoding.DecodeString(body.Iv)
	if errIv != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid base64 iv",
		})
	}

	// create orga member
	orgaMember := models.OrgaMember{
		OrgID:         orgID,
		UserID:        user.ID,
		Role:          "member",
		EncOrgPrivKey: decodedKey,
		EncAesKey:     decodedAesKey,
		Iv:            decodedIv,
	}

	if err := repo.CreateNewOrgaMember(&orgaMember); err != nil {
		if strings.Contains(err.Error(), "unique_org_owner") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "This organization already has an owner. Cannot assign a second one.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create member",
		})
	}

	org, err := repo.GetOrgaByID(orgID)
 	if err != nil {
 		org.Name = "Unknown organization"
 	}

	event := ws.WSEvent{
		Event:   "MEMBER_ADDED",
		OrgID:   orgID.String(),
		Message: "New member [" + body.Email + "] added to the organization [" + org.Name + "]",
		Data: fiber.Map{
			"email":   body.Email,
			"role":    "member",
			"user_id": user.ID.String(),
			"org_name":  org.Name,
		},
	}

	errPublish := h.Hub.PublishToOrga(context.Background(), orgID.String(), event)
	if errPublish != nil {
		log.Printf("[WS] Non-blocking error during Redis notification: %v", errPublish)
	}

	userEvent := ws.WSEvent{
		Event:   "ADDED_TO_NEW_ORGA",
		Message: "You have been added to a new organization [" + org.Name + "]",
		Data: fiber.Map{
			"org_id": orgID.String(),
		},
	}

	errPublish = h.Hub.PublishToUser(context.Background(), user.ID.String(), userEvent)
	if errPublish != nil {
		log.Printf("[WS] Non-blocking error during Redis notification: %v", errPublish)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "member added to organization",
	})
}

func (h *OrgaHandler) ChangeRole(c fiber.Ctx) error {
	var body struct {
		Role string `json:"role"`
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request body is empty",
		})
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if body.Role == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "role is required",
		})
	}

	if body.Role == "owner" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "cannot manually set role to owner",
        })
    }

	if body.Role != "admin" && body.Role != "member" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "role can only be admin or member",
		})
	}

	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDParam := c.Params("user_id")
	if userIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id is required in path"})
	}

	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id format",
		})
	}

	var member models.OrgaMember
	repo := repository.NewOrganizationRepository(h.DB)
	if err := repo.GetOrgaMember(orgID, userID, &member); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
	}

	if member.Role == "owner" {
        return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
            "error": "cannot change the role of the organization owner",
        })
    }


	updated, err := repo.UpdateMemberRole(orgID, userID, body.Role)
	if err != nil {
		if strings.Contains(err.Error(), "unique_org_owner") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "This organization already has an owner. Cannot assign a second one.",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update member role"})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

	var targetUser models.User
	if err := repo.GetUserByID(userID, &targetUser); err != nil { targetUser.Email = "unknown" }

	org, err := repo.GetOrgaByID(orgID)
 	if err != nil { org.Name = "Unknown organization" }

	event := ws.WSEvent{
		Event:   "ROLE_UPDATED",
		OrgID:   orgID.String(),
		Message: targetUser.Email + "'s role has been updated to " + body.Role + " in organization [" + org.Name + "]",
		Data: fiber.Map{
			"user_id": userID.String(),
			"role":    body.Role,
		},
	}

	if err := h.Hub.PublishToOrga(context.Background(), orgID.String(), event); err != nil {
		log.Printf("failed to publish ROLE_UPDATED event for org %s user %s: %v", orgID.String(), userID.String(), err)
	}

	userEvent := ws.WSEvent{
		Event:   "ROLE_UPDATED",
		Message: "You role has changed to " + body.Role + " in organization [" + org.Name + "]",
		Data: fiber.Map{
			"org_id": orgID.String(),
			"role":    body.Role,
		},
	}


	err = h.Hub.PublishToUser(context.Background(), userID.String(), userEvent)
	if err != nil {
		log.Printf("[WS] Non-blocking error during Redis notification: %v", err)
	}


	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "role updated",
	})
}

func (h *OrgaHandler) LeaveOrga(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDLocals, errUser := c.Locals("user_id").(string)
	if !errUser {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user_id type"})
	}

	userID, errUserID := uuid.Parse(userIDLocals)
	if errUserID != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error":"invalid UUID for user"})
	}

	var member models.OrgaMember
	repo := repository.NewOrganizationRepository(h.DB)

	if err := repo.GetOrgaMember(orgID, userID, &member); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
	}

	if member.Role == "owner" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you are the owner, you can't leave the organization",
		})
	}

	if err := repo.TransferFilesToOwner(orgID, userID); err != nil {
		if errors.Is(err, repository.ErrOwnerNotFound) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "organization has no owner to transfer files to",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to secure files before leaving",
		})
	}



	deleted, err := repo.DeleteOrgaMember(orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete org member"})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

	var targetUser models.User
	if err := repo.GetUserByID(userID, &targetUser); err != nil { targetUser.Email = "unknown" }

	org, err := repo.GetOrgaByID(orgID)
 	if err != nil { org.Name = "Unknown organization" }

	orgaEvent := ws.WSEvent{
		Event:   "MEMBER_REMOVED",
		OrgID:   orgID.String(),
		Message: targetUser.Email + " has left the organization [" + org.Name + "]",
		Data:    fiber.Map{"user_id": userID.String()},
	}
	_ = h.Hub.PublishToOrga(context.Background(), orgID.String(), orgaEvent)

	userEvent := ws.WSEvent{
		Event:   "REMOVED_FROM_ORGA",
		Message: "You left the organization [" + org.Name + "]",
		Data:    fiber.Map{"org_id": orgID.String()},
	}
	_ = h.Hub.PublishToUser(context.Background(), userID.String(), userEvent)

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrgaHandler) DeleteMember(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDParam := c.Params("user_id")
	if userIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id is required in path"})
	}

	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id format",
		})
	}

	repo := repository.NewOrganizationRepository(h.DB)
	var member models.OrgaMember
	if err := repo.GetOrgaMember(orgID, userID, &member); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
	}

	if err := repo.TransferFilesToOwner(orgID, userID); err != nil {
		if errors.Is(err, repository.ErrOwnerNotFound) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "organization has no owner to transfer files to",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to secure files before leaving",
		})
	}

	deleted, err := repo.DeleteOrgaMember(orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete org member"})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

	var targetUser models.User
	if err := repo.GetUserByID(userID, &targetUser); err != nil { targetUser.Email = "unknown" }

	org, err := repo.GetOrgaByID(orgID)
 	if err != nil { org.Name = "Unknown organization" }

	orgaEvent := ws.WSEvent{
		Event:   "MEMBER_REMOVED",
		OrgID:   orgID.String(),
		Message: targetUser.Email + " has left the organization [" + org.Name + "]",
		Data:    fiber.Map{"user_id": userID.String()},
	}
	_ = h.Hub.PublishToOrga(context.Background(), orgID.String(), orgaEvent)

	userEvent := ws.WSEvent{
		Event:   "REMOVED_FROM_ORGA",
		Message: "You have been removed from the organization [" + org.Name + "]",
		Data:    fiber.Map{"org_id": orgID.String()},
	}
	_ = h.Hub.PublishToUser(context.Background(), userID.String(), userEvent)

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrgaHandler) GetMembers(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	var orgaMembers []models.OrgaMemberResponse

	repo := repository.NewOrganizationRepository(h.DB)
	orgaMembers, result := repo.GetAllMembersFromOrga(orgID)

	if result != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	onlineUsers, err := h.Hub.Redis.SMembers(c.Context(), "online_users").Result()
	onlineMap := make(map[string]bool)
	if err == nil {
		for _, uID := range onlineUsers {
			onlineMap[uID] = true
		}
	}

	for i := range orgaMembers {
		userIDStr := orgaMembers[i].UserID.String()
		orgaMembers[i].IsOnline = onlineMap[userIDStr]
	}

	return c.Status(fiber.StatusOK).JSON(orgaMembers)
}

func (h *OrgaHandler) GetMemberKeys(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDLocals, errUser := c.Locals("user_id").(string)
	if !errUser {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user_id type"})
	}

	userID, errUserID := uuid.Parse(userIDLocals)
	if errUserID != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid UUID for user"})
	}

	var member models.OrgaMember
	repo := repository.NewOrganizationRepository(h.DB)

	if err := repo.GetOrgaMember(orgID, userID, &member); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"enc_org_priv_key": base64.StdEncoding.EncodeToString(member.EncOrgPrivKey),
		"enc_aes_key":      base64.StdEncoding.EncodeToString(member.EncAesKey),
		"iv":               base64.StdEncoding.EncodeToString(member.Iv),
	})
}

func (h *OrgaHandler) TransferOwnership(c fiber.Ctx) error {
	var body struct {
		NewOwnerID string `json:"new_owner_id"`
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	orgID, errOrg := uuid.Parse(c.Params("org_id"))
	newOwnerID, errNewOwner := uuid.Parse(body.NewOwnerID)
	if errOrg != nil || errNewOwner != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid uuid format"})
	}

	userIDLocals, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user id"})
	}
	currentOwnerID, errUserID := uuid.Parse(userIDLocals)
	if errUserID != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid UUID for user"})
	}

	repo := repository.NewOrganizationRepository(h.DB)

	var currentMember models.OrgaMember
	if err := repo.GetOrgaMember(orgID, currentOwnerID, &currentMember); err != nil || currentMember.Role != "owner" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "only the organization owner can transfer ownership"})
	}

	var targetMember models.OrgaMember
	if err := repo.GetOrgaMember(orgID, newOwnerID, &targetMember); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "target user is not a member of this organization"})
	}

	var ownedCount int64
    errCount := h.DB.Table("org_members").
        Where("user_id = ? AND role = ?", newOwnerID, "owner").
        Count(&ownedCount).Error

    if errCount != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to verify user organization limit"})
    }

    if ownedCount >= 10 {
        return c.Status(fiber.StatusConflict).JSON(fiber.Map{
            "error": "The target user already owns the maximum allowed number of organizations (10).",
        })
    }

	if err := repo.TransferOwnership(orgID, currentOwnerID, newOwnerID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to transfer ownership"})
	}

	org, err := repo.GetOrgaByID(orgID)
 	if err != nil { org.Name = "Unknown organization" }
	var targetUser models.User
	if err := repo.GetUserByID(newOwnerID, &targetUser); err != nil { targetUser.Email = "unknown" }

	event := ws.WSEvent{
		Event:   "ROLE_UPDATED",
		OrgID:   orgID.String(),
		Message: "Ownership of [" + org.Name + "] has been transferred to " + targetUser.Email,
		Data: fiber.Map{
			"user_id": newOwnerID.String(),
			"role":    "owner",
		},
	}
	if err := h.Hub.PublishToOrga(context.Background(), orgID.String(), event); err != nil {
		log.Printf("failed to publish ROLE_UPDATED event for org %s user %s: %v", orgID.String(), newOwnerID.String(), err)
	}

	userEvent := ws.WSEvent{
		Event:   "ROLE_UPDATED",
		Message: "Your role has changed to owner in organization [" + org.Name + "]",
		Data: fiber.Map{
			"org_id": orgID.String(),
			"role":   "owner",
		},
	}

	err = h.Hub.PublishToUser(context.Background(), newOwnerID.String(), userEvent)
	if err != nil {
		log.Printf("[WS] Non-blocking error during Redis notification: %v", err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ownership transferred successfully",
	})
}
