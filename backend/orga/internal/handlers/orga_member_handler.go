package handlers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"github.com/google/uuid"

	"backend/orga/internal/models"
	"errors"
)

func (h *OrgaHandler) CreateOrgaMember(c fiber.Ctx) error {
	var body struct {
		Email   string `json:"user_email" validate:"required"`
		EncOrgaPrivateKey string `json:"encrypted_org_key" validate:"required"`
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
		return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	// check if added user exist
	var User struct {
		ID uuid.UUID
	}
	userErr := h.DB.Table("users").Where("email = ?", body.Email).Take(&User).Error

	if userErr != nil {
		// fmt.Println("error is ", userErr)
		if errors.Is(userErr, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "user not found"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": userErr.Error()})
	}

	// check if user already is part of orga
	var Member struct {
		ID uuid.UUID
	}
	memberErr := h.DB.Table("org_members").Where("user_id = ? AND org_id = ?", User.ID, orgID).Take(&Member).Error

	if memberErr == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user is already part of the organization"})
	}

	// create orga member
	orgaMember := models.OrgaMember{
		OrgID: orgID,
		UserID: User.ID,
		Role: "member",
		EncOrgPrivKey: []byte(body.EncOrgaPrivateKey),

	}

	if err := h.DB.Create(&orgaMember).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create member",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		// ???
	})
}

func (h *OrgaHandler) ChangeRole(c fiber.Ctx) error {
	var body struct {
		Role	string `json:"role" validate:"required"`
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
		return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDParam := c.Params("user_id")
	if userIDParam == "" {
		return c.Status(400).JSON(fiber.Map{"error": "user_id is required in path"})
	}

	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id format",
		})
	}

	var member models.OrgaMember
	if err := h.DB.First(&member, "user_id = ? AND org_id = ?", userID, orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
    }

	if member.Role == "admin" && body.Role != "admin" {
        var count int64
        h.DB.Model(&models.OrgaMember{}).
            Where("org_id = ? AND role = ?", orgID, "admin").
            Count(&count)

        if count <= 1 {
            return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                "error": "cannot remove the last admin",
            })
        }
	}

    result := h.DB.Model(&models.OrgaMember{}).Where("user_id = ? AND org_id = ?",userID,  orgID).Update("role", body.Role)
    if result.Error != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": result.Error.Error(),
		})
    }
    if result.RowsAffected == 0 {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "organization not found",
		})
    }

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "role updated",
	})
}

func (h *OrgaHandler) LeaveOrga(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDLocals, errUser := c.Locals("user_id").(string)
	if !errUser {
		return c.Status(400).SendString("invalid user_id type")
	}

	userID, errUserID := uuid.Parse(userIDLocals)
	if errUserID != nil {
		return c.Status(400).SendString("invalid UUID for user")
	}

	var member models.OrgaMember
	if err := h.DB.First(&member, "user_id = ? AND org_id = ?", userID, orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
    }

	if member.Role == "admin" {
        var count int64
        h.DB.Model(&models.OrgaMember{}).
            Where("org_id = ? AND role = ?", orgID, "admin").
            Count(&count)

        if count <= 1 {
            return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                "error": "cannot remove the last admin",
            })
        }
	}

    result := h.DB.
        Table("org_members").
        Where("user_id = ? AND org_id = ?", userID, orgID).
        Delete(nil)

    if result.Error != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "database error",
        })
    }

    if result.RowsAffected == 0 {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "member not found",
        })
    }

    return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrgaHandler) DeleteMember(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}

	userIDParam := c.Params("user_id")
	if userIDParam == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user id format",
		})
	}

	var member models.OrgaMember
	if err := h.DB.First(&member, "user_id = ? AND org_id = ?", userID, orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
    }

	if member.Role == "admin" {
        var count int64
        h.DB.Model(&models.OrgaMember{}).
            Where("org_id = ? AND role = ?", orgID, "admin").
            Count(&count)

        if count <= 1 {
            return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                "error": "cannot remove the last admin",
            })
        }
	}

    result := h.DB.
        Table("org_members").
        Where("user_id = ? AND org_id = ?", userID, orgID).
        Delete(nil)

    if result.Error != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "database error",
        })
    }

    if result.RowsAffected == 0 {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "member not found",
        })
    }

    return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrgaHandler) GetMembers(c fiber.Ctx) error {
	orgIDParam := c.Params("org_id")
	if orgIDParam == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
	}

	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid orga id format",
		})
	}
	
	type OrgaMemberResponse struct {
		UserID    	uuid.UUID   `json:"user_id"`
		Role  		string `json:"role"`
		Email		string `json:"email"` // not sure
	}
	
	var OrgaMembers []OrgaMemberResponse

	result := h.DB.Model(&models.OrgaMember{}).
		Select("org_members.user_id, org_members.role, users.email").
		Joins("JOIN users ON users.id = org_members.user_id").
		Where("org_members.org_id = ?", orgID).
		Scan(&OrgaMembers)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	return c.Status(fiber.StatusAccepted).JSON(OrgaMembers)
}