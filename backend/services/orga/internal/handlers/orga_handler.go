package handlers

import (
	"backend/orga/internal/models"
	"backend/orga/internal/repository"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"fmt"
)

func GetOrgas(c fiber.Ctx, db *gorm.DB) error {
	// queries := c.Queries()
	// fmt.Println("All query params:", queries)
	email := c.Query("email") // temporary
	// fmt.Println("email = " + email)
	if email == "" {
		var Orgas []models.Orga

		Orgas, err := repository.GetAllOrgas(db)

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(Orgas)
	} else {
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

		var Orgas []models.Orga

		Orgas, resErr := repository.GetMemberOrga(db, userID)
		if resErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": resErr.Error(),
			})
		}
		return c.JSON(Orgas)

	}

}

func CreateOrga(c fiber.Ctx, db *gorm.DB) error {
	var body struct {
		Name              string `json:"name" validate:"required"`
		PublicKey         string `json:"public_key" validate:"required"`
		EncOrgaPrivateKey string `json:"enc_org_priv_key" validate:"required"`
		Email             string `json:"email"` // temporary to find the user
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
	if err := db.Create(&orga).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create organization",
		})
	}

	// create an orga member with role owner
	// var userID uuid.UUID
	// db.Table("users").Select("id").Where("email = ?", body.Email).
	// Scan(&userID) // temporary

	// temporary
	var result struct {
		ID uuid.UUID
	}

	err := db.Table("users").
		Select("id").
		Where("email = ?", body.Email).
		Take(&result).Error
	if err != nil {
		fmt.Println("error: no user found")
	}

	userID := result.ID
	// temporary

	orgaMember := models.OrgaMember{
		OrgID:         orga.ID,
		UserID:        userID,
		Role:          "owner",
		EncOrgPrivKey: []byte(body.EncOrgaPrivateKey),
	}

	// to transfer to repository
	if err := db.Create(&orgaMember).Error; err != nil {
		db.Delete(&models.Orga{}, orga.ID) // protect ?
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "could not create owner",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":   orga.ID,
		"name": orga.Name,
	})

}

func DeleteOrga(c fiber.Ctx, db *gorm.DB) error {
	fmt.Println("Entering delete function")


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

    result := db.
        Table("organizations").
        Where("id = ?", orgID).
        Delete(nil)

    if result.Error != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "database error",
        })
    }

    if result.RowsAffected == 0 {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error": "orga not found",
        })
    }

    return c.SendStatus(fiber.StatusNoContent)
}
