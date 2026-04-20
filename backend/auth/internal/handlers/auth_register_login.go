package handlers

import (
	"backend/auth/internal/models"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

func (h *AuthHandler) LoginUser(c fiber.Ctx) error {
	req := new(LoginRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if req.Email == "" || req.AuthHash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_parameters"})
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}

	if !verifyArgon2idHash(req.AuthHash, user.ServerSalt, user.AuthHash) {
		log.Printf("[WARN] Login failed for %s: wrong auth_hash", req.Email)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	rtBytes := make([]byte, 32)
	if _, err := rand.Read(rtBytes); err != nil {
		log.Printf("[ERROR] Login: Failed to generate refresh token for %s: %v\n", req.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}
	rawRefreshToken := hex.EncodeToString(rtBytes)

	hashedRefreshToken := hashToken(rawRefreshToken)
	user.RefreshToken = &hashedRefreshToken

	if err := h.DB.Save(&user).Error; err != nil {
		log.Printf("[ERROR] Login: Failed to save refresh token for %s: %v\n", req.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	setRefreshTokenCookie(c, rawRefreshToken)

	log.Printf("[INFO] User %s logged in successfully", user.Email)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token":          accessToken,
		"encrypted_private_key": base64.StdEncoding.EncodeToString(user.EncryptedPrivateKey),
		"iv":                    base64.StdEncoding.EncodeToString(user.IV),
		"public_key":            base64.StdEncoding.EncodeToString(user.PublicKey),
	})
}

func (h *AuthHandler) RegisterUser(c fiber.Ctx) error {
	req := new(RegisterRequest)

	if err := c.Bind().Body(req); err != nil {
		log.Printf("[WARN] Register: Bad JSON format: %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if req.Email == "" || req.AuthHash == "" || req.PublicKey == "" || req.ClientSalt == "" || req.Iv == "" || req.EncryptedPrivateKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_parameters"})
	}

	// TODO:  Regex Email
	// if !isValidEmail(req.Email) { return 400 ... }

	serverHash, serverSaltHex, err := hashWithArgon2id(req.AuthHash)
	if err != nil {
		log.Printf("[ERROR] Register: Argon2id failure: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	clientSalt, err := base64.StdEncoding.DecodeString(req.ClientSalt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_client_salt_format"})
	}

	iv, err := base64.StdEncoding.DecodeString(req.Iv)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_iv_format"})
	}

	pubKey, err := base64.StdEncoding.DecodeString(req.PublicKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_public_key_format"})
	}

	privKey, err := base64.StdEncoding.DecodeString(req.EncryptedPrivateKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_private_key_format"})
	}

	serverSalt, _ := base64.StdEncoding.DecodeString(serverSaltHex)

	rtBytes := make([]byte, 32)
	if _, err := rand.Read(rtBytes); err != nil {
		log.Printf("[ERROR] Register: Random string generation failed: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}
	rawRefreshToken := hex.EncodeToString(rtBytes)

	hashedRefreshToken := hashToken(rawRefreshToken)

	newUser := models.User{
		Email:               req.Email,
		ClientSalt:          clientSalt,
		ServerSalt:          serverSalt,
		IV:                  iv,
		PublicKey:           pubKey,
		EncryptedPrivateKey: privKey,
		AuthHash:            serverHash,
		RefreshToken:        &hashedRefreshToken,
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

	setRefreshTokenCookie(c, rawRefreshToken)

	log.Printf("[INFO] User %s registered successfully\n", req.Email)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "User successfully registered",
		"access_token": accessToken,
	})
}

func (h *AuthHandler) GetClientSalt(c fiber.Ctx) error {

	req := new(SaltRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	var user models.User

	err := h.DB.Where("email= ?", req.Email).First(&user).Error

	var saltHex string

	if err != nil {
		hasher := sha256.New()
		hasher.Write([]byte(req.Email + h.Env.JwtSecret))
		fakeSalt := hasher.Sum(nil)[:16]
		saltHex = base64.StdEncoding.EncodeToString(fakeSalt)

	} else {
		saltHex = base64.StdEncoding.EncodeToString(user.ClientSalt)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"salt": saltHex,
	})
}
