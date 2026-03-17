package handlers

import (
	"log"
	"github.com/gofiber/fiber/v2"
)

type RegisterRequest struct {
	Email               string `json:"email"`
	Salt                string `json:"salt"`
	AuthHash            string `json:"auth_hash"`
	PublicKey           string `json:"public_key"`
	EncryptedPrivateKey string `json:"encrypted_private_key"`
}

func RegisterUser(c *fiber.Ctx) error {
	req := new(RegisterRequest)

	if err := c.BodyParser(req); err != nil {
		log.Printf("[WARN] Register: Bad  format JSON : %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Bad request",
		})
	}

	if req.Email == "" || req.AuthHash == "" || req.PublicKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "missing_param",
		})
	}

	// TODO 4: Check si l'utilisateur existe déjà en DB
	// TODO 5: Hacher req.AuthHash avec Argon2id
	// TODO 6: Insérer dans PostgreSQL via GORM
	// TODO 7: Générer les JWTs (Access & Refresh)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Test all good",
	})
}