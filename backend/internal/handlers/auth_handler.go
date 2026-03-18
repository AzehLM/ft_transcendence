package handlers

import (
	"auth/backend/internal/config"
	"auth/backend/internal/models"
	"crypto/rand"
	"encoding/hex"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/argon2"
	"gorm.io/gorm"
)

type RegisterRequest struct {
	Email               string `json:"email"`
	ClientSalt          string `json:"salt"`
	AuthHash            string `json:"auth_hash"`
	PublicKey           string `json:"public_key"`
	EncryptedPrivateKey string `json:"encrypted_private_key"`
	Iv                  string `json:"iv"`
}

type AuthHandler struct {
	DB  *gorm.DB
	Env *config.Env
}

func NewAuthHandler(db *gorm.DB, env *config.Env) *AuthHandler {
	return &AuthHandler{
		DB:  db,
		Env: env,
	}
}

func hashWithArgon2id(clientAuthHash string) (string, string, error) {

	serverSalt := make([]byte, 16)
	if _, err := rand.Read(serverSalt); err != nil {
		return "", "", err
	}

	var timeCost uint32 = 2
	var memory uint32 = 32768 // 32 MB
	var threads uint8 = 4
	var keyLen uint32 = 32 // 256 bits output

	hash := argon2.IDKey([]byte(clientAuthHash), serverSalt, timeCost, memory, threads, keyLen)

	return hex.EncodeToString(hash), hex.EncodeToString(serverSalt), nil
}

func (h *AuthHandler) RegisterUser(c *fiber.Ctx) error {
	req := new(RegisterRequest)

	if err := c.BodyParser(req); err != nil {
		log.Printf("[WARN] Register: Bad JSON format: %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if req.Email == "" || req.AuthHash == "" || req.PublicKey == "" || req.ClientSalt == "" || req.Iv == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_parameters"})
	}

	// TODO:  Regex Email
	// if !isValidEmail(req.Email) { return 400 ... }

	serverHash, serverSaltHex, err := hashWithArgon2id(req.AuthHash)
	if err != nil {
		log.Printf("[ERROR] Register: Argon2id failure: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	clientSalt, err := hex.DecodeString(req.ClientSalt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_client_salt_format"})
	}

	iv, err := hex.DecodeString(req.Iv)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_iv_format"})
	}

	pubKey, err := hex.DecodeString(req.PublicKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_public_key_format"})
	}

	privKey, err := hex.DecodeString(req.EncryptedPrivateKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_private_key_format"})
	}

	serverSalt, _ := hex.DecodeString(serverSaltHex)

	newUser := models.User{
		Email:               req.Email,
		ClientSalt:          clientSalt,
		ServerSalt:          serverSalt,
		IV:                  iv,
		PublicKey:           pubKey,
		EncryptedPrivateKey: privKey,
		AuthHash:            serverHash,
	}

	if err := h.DB.Create(&newUser).Error; err != nil {
		log.Printf("[WARN] Register: Failed to insert user %s (Duplicate?): %v\n", req.Email, err)
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email_already_exists"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    newUser.ID.String(),
		"user_email": newUser.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		log.Printf("[ERROR] Register: JWT generation failed for %s: %v\n", req.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	rtBytes := make([]byte, 32)
	if _, err := rand.Read(rtBytes); err != nil {
		log.Printf("[ERROR] Register: Random string generation failed: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}
	refreshToken := hex.EncodeToString(rtBytes)

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
	})

	log.Printf("[INFO] User %s registered successfully\n", req.Email)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "User successfully registered",
		"access_token": accessToken,
	})
}

func (h *AuthHandler) GetInfo(c *fiber.Ctx) error {

	userID := c.Locals("user_id").(string)
	userEmail := c.Locals("user_email").(string)

	return c.JSON(fiber.Map{
		"id":    userID,
		"email": userEmail,
	})
}
