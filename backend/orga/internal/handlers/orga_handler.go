package handlers

import (
	"orga/backend/orga/internal/models"
	"orga/backend/orga/internal/repository"

    "gorm.io/gorm"
    "github.com/gofiber/fiber/v2"
)

func GetOrgas(c *fiber.Ctx, db *gorm.DB) error {
	var Orgas []models.Orga 

	Orgas, err := repository.GetAllOrgas(db)

    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": err.Error(),
        })
    }
    return c.JSON(Orgas)
	
}