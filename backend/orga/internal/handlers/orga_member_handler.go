package handlers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"github.com/google/uuid"

	"backend/orga/internal/models"
	"backend/orga/internal/repository"
	"errors"
)

func (h *OrgaHandler) CreateOrgaMember(c fiber.Ctx) error {
	var body struct {
		Email   string `json:"user_email" validate:"required"`
		EncOrgaPrivateKey string `json:"encrypted_org_key" validate:"required"`
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
			"error": "encrypted org key required",
		})
	}

	// fmt.Println("mail: ", body.Email, "and key: ", body.EncOrgaPrivateKey)
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
		// fmt.Println("error is ", userErr)
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

	// create orga member
	orgaMember := models.OrgaMember{
		OrgID: orgID,
		UserID: user.ID,
		Role: "member",
		EncOrgPrivKey: []byte(body.EncOrgaPrivateKey),

	}

	if err := repo.CreateNewOrgaMember(&orgaMember); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create member",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "member added to organization",
	})
}

func (h *OrgaHandler) ChangeRole(c fiber.Ctx) error {
	var body struct {
		Role	string `json:"role" validate:"required"`
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
                "error": "cannot remove the last admin",
            })
        }
	}

	updated, err := repo.UpdateMemberRole(orgID, userID, body.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !updated {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
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
                "error": "cannot remove the last admin",
            })
		}
	}

	deleted, err := repo.DeleteOrgaMember(orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "org_id is required in path"})
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
                "error": "cannot remove the last admin",
            })
		}
	}

	deleted, err := repo.DeleteOrgaMember(orgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !deleted {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found"})
	}

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

	return c.Status(fiber.StatusAccepted).JSON(orgaMembers)
}