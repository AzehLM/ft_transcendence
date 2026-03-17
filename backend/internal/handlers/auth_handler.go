package handlers

import (
	"auth/backend/internal/config"
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

	// TODO: DB Check  Ensure req.Email doesn't already exist in PostgreSQL

	serverHash, serverSalt, err := hashWithArgon2id(req.AuthHash)
	if err != nil {
		log.Printf("[ERROR] Register: Argon2id failure: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	println(serverHash, serverSalt)
	// TODO: DB Insert  Create the User  in PostgreSQL via GORM
	//  store: Email, req.Salt (Client salt), serverSalt (Server salt), serverHash (The Argon2 output with auth_hash), PublicKey, EncryptedPrivateKey.

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_email": req.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	rtBytes := make([]byte, 32)
	rand.Read(rtBytes)
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
