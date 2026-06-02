package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"backend/orga/internal/models"
	"backend/orga/internal/repository"
	"backend/orga/internal/ws"
	"encoding/base64"
	"errors"
	"log"
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

	decodedAesKey, errAes := base64.StdEncoding.DecodeString(body.EncAesKey) // ← nouveau
	if errAes != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid base64 aes key",
		})
	}

	decodedIv, errIv := base64.StdEncoding.DecodeString(body.Iv) // ← nouveau
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create member",
		})
	}

	event := ws.WSEvent{
		Event:   "MEMBER_ADDED",
		OrgID:   orgID.String(),
		Message: "New member added to the org",
		Data: fiber.Map{
			"email":   body.Email,
			"role":    "member",
			"user_id": user.ID.String(),
		},
	}

	errPublish := h.Hub.PublishToOrga(c.Context(), orgID.String(), event)
	if errPublish != nil {
		log.Printf("[WS] Non-blocking error during Redis notification: %v", errPublish)
	}

	userEvent := ws.WSEvent{
		Event:   "ADDED_TO_NEW_ORGA",
		Message: "You have been added to a new organization",
		Data: fiber.Map{
			"org_id": orgID.String(),
		},
	}

	errPublish = h.Hub.PublishToUser(c.Context(), user.ID.String(), userEvent)
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

	if member.Role == "admin" && body.Role != "admin" {
		if repo.CountAdmin(orgID) <= 1 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "cannot demote the last admin",
			})
		}
	}

	updated, err := repo.UpdateMemberRole(orgID, userID, body.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update member role"})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

	event := ws.WSEvent{
		Event:   "ROLE_UPDATED",
		OrgID:   orgID.String(),
		Message: "A member's role has been updated",
		Data: fiber.Map{
			"user_id": userID.String(),
			"role":    body.Role,
		},
	}
	if err := h.Hub.PublishToOrga(c.Context(), orgID.String(), event); err != nil {
		log.Printf("failed to publish ROLE_UPDATED event for org %s user %s: %v", orgID.String(), userID.String(), err)
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
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUserID := uuid.Parse(userIDLocals)
	if errUserID != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
	}

	var member models.OrgaMember
	repo := repository.NewOrganizationRepository(h.DB)

	if err := repo.GetOrgaMember(orgID, userID, &member); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
	}

	if member.Role == "admin" {
		if repo.CountAdmin(orgID) <= 1 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "you are the last admin, you can't leave the organization",
			})
		}
	}

	deleted, err := repo.DeleteOrgaMember(orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete org member"})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

	orgaEvent := ws.WSEvent{
		Event:   "MEMBER_REMOVED",
		OrgID:   orgID.String(),
		Message: "A member has left the organization",
		Data:    fiber.Map{"user_id": userID.String()},
	}
	_ = h.Hub.PublishToOrga(c.Context(), orgID.String(), orgaEvent)

	userEvent := ws.WSEvent{
		Event:   "REMOVED_FROM_ORGA",
		Message: "You left the organization",
		Data:    fiber.Map{"org_id": orgID.String()},
	}
	_ = h.Hub.PublishToUser(c.Context(), userID.String(), userEvent)

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

	if member.Role == "admin" {
		if repo.CountAdmin(orgID) <= 1 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "you can't delete the last admin",
			})
		}
	}

	deleted, err := repo.DeleteOrgaMember(orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete org member"})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

	orgaEvent := ws.WSEvent{
		Event:   "MEMBER_REMOVED",
		OrgID:   orgID.String(),
		Message: "A member has left the organization",
		Data:    fiber.Map{"user_id": userID.String()},
	}
	_ = h.Hub.PublishToOrga(c.Context(), orgID.String(), orgaEvent)

	userEvent := ws.WSEvent{
		Event:   "REMOVED_FROM_ORGA",
		Message: "You have been removed from the organization",
		Data:    fiber.Map{"org_id": orgID.String()},
	}
	_ = h.Hub.PublishToUser(c.Context(), userID.String(), userEvent)

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
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUserID := uuid.Parse(userIDLocals)
	if errUserID != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
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
		// "enc_org_priv_key_brut": string(member.EncOrgPrivKey),
	})
}
