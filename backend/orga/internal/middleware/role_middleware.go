package middleware

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"fmt"
	"orga/backend/orga/internal/models"

	"github.com/google/uuid"
)

// temporary middleware to check user role in organization
func CheckRoleAdminOwner(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		email := c.Query("email")
		if email == "" {
			return c.Status(401).JSON(fiber.Map{"error": "email is required in query"})
		}

		// temporary
		var result struct {
			ID uuid.UUID
		}

		err := db.Table("users").
			Select("id").
			Where("email = ?", email).
			Take(&result).Error
		if err != nil {
			fmt.Println("error: no user found")
			return err
		}

		userID := result.ID
		// temporary

		orgID := c.Params("org_id")
		if orgID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "org_id is required in path"})
		}

		var Member models.OrgaMember
		memberErr := db.Where("user_id = ? AND org_id = ?", userID, orgID).First(&Member).Error

		if memberErr != nil {
			// fmt.Println("error is ", memberErr)
			if errors.Is(memberErr, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "member not found in this organization"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "database error"})
		}

		if Member.Role == "admin" || Member.Role == "owner" {
			return c.Next()
		}

		return c.Status(403).JSON(fiber.Map{"error": "member does not have the rights"})
	}
}
