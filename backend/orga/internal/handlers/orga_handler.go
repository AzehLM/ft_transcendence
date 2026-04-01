package handlers

import (
	"backend/orga/internal/models"
	"backend/orga/internal/repository"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrgaHandler struct {
	DB  *gorm.DB
}

func NewOrgaHandler(db *gorm.DB) *OrgaHandler {
	return &OrgaHandler{
		DB:  db,
	}
}

func (h *OrgaHandler) GetOrgas(c fiber.Ctx) error {
	userIDLocals, err := c.Locals("user_id").(string)
	if !err {
		return c.Status(400).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(400).SendString("invalid UUID for user")
	}

	var Orgas []models.Orga
	repo := repository.NewOrganizationRepository(h.DB)
	Orgas, resErr := repo.GetMemberOrga(userID)
	if resErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": resErr.Error(),
		})
	}
	return c.JSON(Orgas)

}


func (h *OrgaHandler) CreateOrga(c fiber.Ctx) error {
	var body struct {
		Name              string `json:"name" validate:"required"`
		PublicKey         string `json:"public_key" validate:"required"`
		EncOrgaPrivateKey string `json:"enc_org_priv_key" validate:"required"`
	}

	if len(c.Body()) == 0 {
		return c.Status(400).JSON(fiber.Map{
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

	orga := models.Orga{
		Name:      body.Name,
		PublicKey: []byte(body.PublicKey),
	}

	// to tranfer to repository
    repo := repository.NewOrganizationRepository(h.DB)
    if err := repo.CreateNewOrga(&orga); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create organization",
		})
	}

	// create an orga member with role admin
	userIDLocals, err := c.Locals("user_id").(string)
	if !err {
		return c.Status(400).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(400).SendString("invalid UUID for user")
	}

	orgaMember := models.OrgaMember{
		OrgID:         orga.ID,
		UserID:        userID,
		Role:          "admin",
		EncOrgPrivKey: []byte(body.EncOrgaPrivateKey),
	}

	if err := repo.CreateNewOrgaMember(&orgaMember); err != nil {
		repo.DeleteOrganization(orga.ID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create admin",
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

	repo := repository.NewOrganizationRepository(h.DB)
	deleted, err := repo.DeleteOrganization(orgID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"error": "organization not found"})
	}

	// delete all MinIO files

    return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrgaHandler) ChangeOrgaName(c fiber.Ctx) error {
	var body struct {
		Name string `json:"name" validate:"required"`
	}

	if len(c.Body()) == 0 {
		return c.Status(400).JSON(fiber.Map{
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
			"error" : "name required",
		})
	}

	orgIDParam := c.Params("org_id")
	orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist

	repo := repository.NewOrganizationRepository(h.DB)
	deleted, err := repo.UpdateOrgaName(orgID, body.Name)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if !deleted {
		return c.Status(404).JSON(fiber.Map{"error": "organization not found"})
	}
    return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "organization name updated",
	})
}