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

func CreateOrga(c *fiber.Ctx, db *gorm.DB) error {
	var body struct {
		Name string `json:"name" validate:"required"`
		PublicKey string `json:"public_key" validate:"required"`
	}

	if err:= c.BodyParser(&body); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "invalid body",
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

	orga := models.Orga {
		Name: body.Name,
		PublicKey: []byte(body.PublicKey),
	}

	// create an orga member with role owner

    if err := db.Create(&orga).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "could not create organization",
        })
    }

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id": orga.ID,
		"name": orga.Name,
	})

}