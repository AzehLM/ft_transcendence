package middleware

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"github.com/google/uuid"
)

// check organization exist
func CheckOrgaExist(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
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

		var orga struct {
			ID uuid.UUID
		}
		orgaResult := db.Table("organizations").Where("id = ?", orgID).Take(&orga)
		if orgaResult.Error != nil {
			if errors.Is(orgaResult.Error, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "organization not found"})
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": orgaResult.Error.Error()})
		} else {
			return c.Next()
		}
	}
}

// check user is part of organization
func CheckUserInOrga(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		orgIDParam := c.Params("org_id")
		orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist

		userIDLocals, err := c.Locals("user_id").(string)
		if !err {
			return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
		}

		userID, errUser := uuid.Parse(userIDLocals)
		if errUser != nil {
			return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
		}

		var Member struct {
			ID uuid.UUID
			Role string
		}
		memberErr := db.Table("org_members").Where("user_id = ? AND org_id = ?", userID, orgID).Take(&Member).Error

		if memberErr != nil {
			if errors.Is(memberErr, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found in this organization"})
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": memberErr.Error()})
		}

		return c.Next()
	}
}

// check user is member of organization
func CheckUserIsMember(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		orgIDParam := c.Params("org_id")
		orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist

		userIDLocals, err := c.Locals("user_id").(string)
		if !err {
			return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
		}

		userID, errUser := uuid.Parse(userIDLocals)
		if errUser != nil {
			return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
		}

		var Member struct {
			ID uuid.UUID
			Role string
		}
		memberErr := db.Table("org_members").Where("user_id = ? AND org_id = ?", userID, orgID).Take(&Member).Error

		if memberErr != nil {
			if errors.Is(memberErr, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found in this organization"})
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": memberErr.Error()})
		}

		if Member.Role == "member" {
			return c.Next()
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "member does not have the rights"})
	}
}

// check user is admin of organization
func CheckUserIsAdmin(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		orgIDParam := c.Params("org_id")
		orgID, _ := uuid.Parse(orgIDParam) // not checked as the function should be used after CheckOrgaExist

		userIDLocals, err := c.Locals("user_id").(string)
		if !err {
			return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
		}

		userID, errUser := uuid.Parse(userIDLocals)
		if errUser != nil {
			return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
		}

		var Member struct {
			ID uuid.UUID
			Role string
		}
		memberErr := db.Table("org_members").Where("user_id = ? AND org_id = ?", userID, orgID).Take(&Member).Error

		if memberErr != nil {
			if errors.Is(memberErr, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "member not found in this organization"})
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": memberErr.Error()})
		}

		if Member.Role == "admin" {
			return c.Next()
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "member does not have the rights"})
	}
}