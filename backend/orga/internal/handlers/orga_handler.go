package handlers

import (
	"orga/backend/orga/internal/models"
	"orga/backend/orga/internal/repository"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"

    "fmt"
)

func GetOrgas(c fiber.Ctx, db *gorm.DB) error {
	var Orgas []models.Orga 

	Orgas, err := repository.GetAllOrgas(db)

    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(map[string]any{
            "error": err.Error(),
        })
    }

    return c.JSON(Orgas)
	
}

func CreateOrga(c fiber.Ctx, db *gorm.DB) error {
	var body struct {
		Name string `json:"name" validate:"required"`
		PublicKey string `json:"public_key" validate:"required"`
        EncOrgaPrivateKey string `json:"enc_org_priv_key" validate:"required"`
        Email string `json:"email"` // temporary to find the user
    }

	if err:= c.Bind().Body(&body); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(map[string]any{
            "error": err.Error(),
        })
	}
    if body.Name == "" {
        return c.Status(fiber.StatusBadRequest).JSON(map[string]any{
            "error": "name is required",
        })
    }
    if body.PublicKey == "" {
        return c.Status(fiber.StatusBadRequest).JSON(map[string]any{
            "error": "public key is required",
        })
    }
    if body.EncOrgaPrivateKey == "" {
        return c.Status(fiber.StatusBadRequest).JSON(map[string]any{
            "error": "encrypted private key is required",
        })
    }

	orga := models.Orga {
		Name: body.Name,
		PublicKey: []byte(body.PublicKey),
	}

    
    if err := db.Create(&orga).Error; err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(map[string]any{
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

    orgaMember := models.OrgaMember {
        OrgID: orga.ID,
        UserID: userID,
        Role: "owner",
        EncOrgPrivKey: []byte(body.EncOrgaPrivateKey),
    }

    if err := db.Create(&orgaMember).Error; err != nil {
        db.Delete(&models.Orga{}, orga.ID) // protect ?
        return c.Status(fiber.StatusInternalServerError).JSON(map[string]any{
            "error": "could not create owner",
        })
    }

    return c.Status(fiber.StatusCreated).JSON(map[string]any{
		"id": orga.ID,
		"name": orga.Name,
	})

}