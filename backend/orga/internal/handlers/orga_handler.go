package handlers

import (
	"backend/orga/internal/models"
	"backend/orga/internal/repository"
	"backend/orga/internal/workers"
	"context"
	"log"

	"backend/orga/internal/ws"
	"encoding/base64"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrgaHandler struct {
	DB        *gorm.DB
	Hub       *ws.Hub
	Publisher *workers.EventPublisher
}

func NewOrgaHandler(db *gorm.DB, hub *ws.Hub, publisher *workers.EventPublisher) *OrgaHandler {
	return &OrgaHandler{
		DB:        db,
		Hub:       hub,
		Publisher: publisher,
	}
}

func (h *OrgaHandler) GetOrgas(c fiber.Ctx) error {
	userIDLocals, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
	}

	repo := repository.NewOrganizationRepository(h.DB)

	var orgResponses []models.OrgResponse
	orgResponses, resErr := repo.GetMemberOrga(userID)
	if resErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": resErr.Error(),
		})
	}

	return c.JSON(orgResponses)
}

func (h *OrgaHandler) CreateOrga(c fiber.Ctx) error {
	var body struct {
		Name              string `json:"name"`
		PublicKey         string `json:"public_key"`
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
	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "name is required",
		})
	}
	if body.PublicKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "public key is required",
		})
	}
	if body.EncOrgaPrivateKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "encrypted private key is required",
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

	decodedPublicKey, errPublicKey := base64.StdEncoding.DecodeString(body.PublicKey)
	if errPublicKey != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid base64 publicKey",
		})
	}

	orga := models.Orga{
		Name:      body.Name,
		PublicKey: decodedPublicKey,
	}

	// create an orga member with role admin
	userIDLocals, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
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

	orgaMember := models.OrgaMember{
		UserID:        userID,
		Role:          "admin",
		EncOrgPrivKey: decodedKey,
		EncAesKey:     decodedAesKey,
		Iv:            decodedIv,
	}

	repo := repository.NewOrganizationRepository(h.DB)
	if err := repo.CreateOrgWithAdmin(&orga, &orgaMember); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create organization with admin",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":   orga.ID,
		"name": orga.Name,
	})

}

func (h *OrgaHandler) DeleteOrga(c fiber.Ctx) error {

	orgIDParam := c.Params("org_id")
	orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist

	if err := h.Publisher.PublishOrgDeleted(context.TODO(), orgID); err != nil {
		log.Printf("[EVENT] failed to publish org_deleted for org %s: %v", orgID.String(), err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "failed to enqueue organization cleanup",
		})
	}

	repo := repository.NewOrganizationRepository(h.DB)
	deleted, err := repo.DeleteOrganization(orgID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
	}

	event := ws.WSEvent{
		Event:   "ORGA_DELETED",
		OrgID:   orgID.String(),
		Message: "Organization has been permanently deleted",
	}
	if errPublish := h.Hub.PublishToOrga(c.Context(), orgID.String(), event); errPublish != nil {
		log.Printf("[WS] Non-blocking error: failed to publish ORGA_DELETED: %v", errPublish)
	}

	return c.SendStatus(fiber.StatusNoContent)

}

func (h *OrgaHandler) ChangeOrgaName(c fiber.Ctx) error {
	var body struct {
		Name string `json:"name"`
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

	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "name required",
		})
	}

	orgIDParam := c.Params("org_id")
	orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist

	repo := repository.NewOrganizationRepository(h.DB)
	updated, err := repo.UpdateOrgaName(orgID, body.Name)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
	}

	event := ws.WSEvent{
		Event:   "ORGA_RENAMED",
		OrgID:   orgID.String(),
		Message: "Organization name updated",
		Data: fiber.Map{
			"new_name": body.Name,
		},
	}
	if errPublish := h.Hub.PublishToOrga(c.Context(), orgID.String(), event); errPublish != nil {
		log.Printf("[WS] Non-blocking error: failed to publish ORGA_RENAMED: %v", errPublish)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "organization name updated",
	})
}

func (h *OrgaHandler) GetOrgaPublicKey(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "org_id is required in path",
		})
	}
	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	repo := repository.NewOrganizationRepository(h.DB)
	var orga models.Orga
	orga, errOrg := repo.GetOrgaByID(orgID)
	if errOrg != nil {
		if errors.Is(errOrg, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch organization"})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"public_key": base64.StdEncoding.EncodeToString(orga.PublicKey),
	})
}

func (h *OrgaHandler) GetOrgaInfo(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "org_id is required",
		})
	}
	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid org id",
		})
	}

	userIDLocals := c.Locals("user_id").(string)
	if userIDLocals == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id not found"})
	}

	userID, err := uuid.Parse(userIDLocals)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id format",
		})
	}

	repo := repository.NewOrganizationRepository(h.DB)
	orga, err := repo.GetOrgaByID(orgID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch organization"})
	}

	role, err := repo.GetMemberRole(orgID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "you are not a member of this organization"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch organization"})
	}

	description, err := repo.GetDescription(orgID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "you are not a member of this organization"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch organization"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"id":          orga.ID,
		"name":        orga.Name,
		"used_space":  orga.UsedSpace,
		"max_space":   orga.MaxSpace,
		"role":        role,
		"description": description,
	})
}

func (h *OrgaHandler) ChangeDescription(c fiber.Ctx) error {
	var body struct {
		Description string `json:"description"`
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

	orgIDParam := c.Params("org_id")
	orgID, _ := uuid.Parse(orgIDParam)

	userIDLocals, ok := c.Locals("user_id").(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user_id type"})
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid UUID for user"})
	}

	repo := repository.NewOrganizationRepository(h.DB)
	updated, errRepo := repo.UpdateDescription(orgID, userID, body.Description)
	if errRepo != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": errRepo.Error()})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "organization description updated",
	})
}
