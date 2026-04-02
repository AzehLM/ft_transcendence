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
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
	}

	var orgas []models.Orga
	repo := repository.NewOrganizationRepository(h.DB)
	orgas, resErr := repo.GetMemberOrga(userID)
	if resErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": resErr.Error(),
		})
	}
	return c.JSON(orgas)

}


func (h *OrgaHandler) CreateOrga(c fiber.Ctx) error {
	var body struct {
		Name              string `json:"name" validate:"required"`
		PublicKey         string `json:"public_key" validate:"required"`
		EncOrgaPrivateKey string `json:"enc_org_priv_key" validate:"required"`
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
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
	}

	// delete all MinIO files

    return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrgaHandler) ChangeOrgaName(c fiber.Ctx) error {
	var body struct {
		Name string `json:"name" validate:"required"`
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
			"error" : "name required",
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
    return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "organization name updated",
	})
}

func (h *OrgaHandler) PatchMaxSpace(c fiber.Ctx) error {
	var body struct {
		Space int64 `json:"space" validate:"required"`
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

	// if body.Space <= 0 {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error" : "space must be positive",
	// 	})
	// }

	orgIDParam := c.Params("org_id")
	orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist
	
	var org models.Orga
	repo := repository.NewOrganizationRepository(h.DB)
	org, orgErr := repo.GetOrgaByID(orgID)
	if (orgErr != nil) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": orgErr.Error()})
	}

    if org.MaxSpace+body.Space > 21474836480 { // 20 giga
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "max space can't be over 20 giga",
        })
    }

    if org.MaxSpace+body.Space < 5368709120 {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "max space can't be under 5 giga",
        })
    }

	newSpace := org.MaxSpace+body.Space
	updated, err := repo.UpdateSpace(org.MaxSpace+body.Space, orgID, "max_space")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
	}

    return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"max_space": newSpace,
	})
}

func (h *OrgaHandler) PatchUsedSpace(c fiber.Ctx) error {
	var body struct {
		Space int64 `json:"space" validate:"required"`
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

	// if body.Space <= 0 {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error" : "space must be positive",
	// 	})
	// }

	orgIDParam := c.Params("org_id")
	orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist
	
	var org models.Orga
	repo := repository.NewOrganizationRepository(h.DB)
	org, orgErr := repo.GetOrgaByID(orgID)
	if (orgErr != nil) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": orgErr.Error()})
	}

    if org.UsedSpace+body.Space > org.MaxSpace { 
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "space limit exceeded",
        })
    }

    if org.UsedSpace+body.Space < 0 {
        body.Space = org.UsedSpace*-1
    }
	newSpace := org.UsedSpace+body.Space
	updated, err := repo.UpdateSpace(org.UsedSpace+body.Space, orgID, "used_space")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
	}

    return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"used_space": newSpace,
	})
}