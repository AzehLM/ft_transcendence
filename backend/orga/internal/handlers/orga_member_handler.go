package handlers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"github.com/google/uuid"

	"backend/orga/internal/models"
	"errors"
	"fmt"
)

func CreateOrgaMember(c fiber.Ctx, db *gorm.DB) error {
	fmt.Println("Entering create member")
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

	fmt.Println("mail: ", body.Email, "and key: ", body.EncOrgaPrivateKey)
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

	fmt.Println("orga id = ", orgID)

	// check if orga exist
	var Orga models.Orga
	orgaResult := db.Table("organizations").Where("id = ?", orgID).First(&Orga)
	fmt.Println("orga result = ", orgaResult)
	if orgaResult.Error != nil {
		if errors.Is(orgaResult.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "organization not found"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": orgaResult.Error.Error()})
	}
	// check if user exist
	var User struct {
		ID uuid.UUID
	}
	userErr := db.Table("users").Where("email = ?", body.Email).Take(&User).Error

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
	memberErr := db.Table("org_members").Where("user_id = ? AND org_id = ?", User.ID, orgID).Take(&Member).Error

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

	if err := db.Create(&orgaMember).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create member",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		// ???
	})
}

func ChangeRole(c fiber.Ctx, db *gorm.DB) error {
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

	var orga models.Orga
	if err := db.First(&orga, "id = ?", orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "organization not found",
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
	if err := db.First(&member, "user_id = ? AND org_id = ?", userID, orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
    }

	if member.Role == "admin" && body.Role != "admin" {
        var count int64
        db.Model(&models.OrgaMember{}).
            Where("org_id = ? AND role = ?", orgID, "admin").
            Count(&count)

        if count <= 1 {
            return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                "error": "cannot remove the last admin",
            })
        }
	}

    result := db.Model(&models.OrgaMember{}).Where("user_id = ? AND org_id = ?",userID,  orgID).Update("role", body.Role)
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

func LeaveOrga(c fiber.Ctx, db *gorm.DB) error {
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

	var orga models.Orga
	if err := db.First(&orga, "id = ?", orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "organization not found",
		})
    }

	email := c.Query("email")
	if email == "" {
		return c.Status(401).JSON(fiber.Map{"error": "email is required in query"})
	}

	// temporary
	var user struct {
		ID uuid.UUID
	}

	userErr := db.Table("users").
		Select("id").
		Where("email = ?", email).
		Take(&user).Error
	if userErr != nil {
		fmt.Println("error: no user found")
		return userErr
	}

	userID := user.ID
	// temporary

	var member models.OrgaMember
	if err := db.First(&member, "user_id = ? AND org_id = ?", userID, orgID).Error; err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "member not found",
		})
    }

	if member.Role == "admin" {
        var count int64
        db.Model(&models.OrgaMember{}).
            Where("org_id = ? AND role = ?", orgID, "admin").
            Count(&count)

        if count <= 1 {
            return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
                "error": "cannot remove the last admin",
            })
        }
	}

    result := db.
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