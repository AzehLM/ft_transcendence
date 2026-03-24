package handlers

import (
	"auth/backend/internal/config"
	"auth/backend/internal/models"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
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

type SaltRequest struct {
	Email string `json:"email"`
}

type AuthHandler struct {
	DB  *gorm.DB
	Env *config.Env
}

type LoginRequest struct {
	Email    string `json:"email"`
	AuthHash string `json:"auth_hash"`
}

type UpdatePasswordRequest struct {
	OldAuthHash         string `json:"old_auth_hash"`
	NewAuthHash         string `json:"new_auth_hash"`
	NewClientSalt       string `json:"new_client_salt"`
	NewIv               string `json:"new_iv"`
	NewEncryptedPrivKey string `json:"new_encrypted_private_key"`
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

func verifyArgon2idHash(clientAuthHash string, serverSalt []byte, storedHashHex string) bool {
	var timeCost uint32 = 2
	var memory uint32 = 32768
	var threads uint8 = 4
	var keyLen uint32 = 32

	computedHash := argon2.IDKey([]byte(clientAuthHash), serverSalt, timeCost, memory, threads, keyLen)
	computedHashHex := hex.EncodeToString(computedHash)

	return subtle.ConstantTimeCompare([]byte(computedHashHex), []byte(storedHashHex)) == 1
}

func (h *AuthHandler) RegisterUser(c fiber.Ctx) error {
	req := new(RegisterRequest)

	if err := c.Bind().Body(req); err != nil {
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

	rtBytes := make([]byte, 32)
	if _, err := rand.Read(rtBytes); err != nil {
		log.Printf("[ERROR] Register: Random string generation failed: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}
	refreshToken := hex.EncodeToString(rtBytes)

	newUser := models.User{
		Email:               req.Email,
		ClientSalt:          clientSalt,
		ServerSalt:          serverSalt,
		IV:                  iv,
		PublicKey:           pubKey,
		EncryptedPrivateKey: privKey,
		AuthHash:            serverHash,
		RefreshToken:        &refreshToken,
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

	setRefreshTokenCookie(c, refreshToken)

	log.Printf("[INFO] User %s registered successfully\n", req.Email)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "User successfully registered",
		"access_token": accessToken,
	})
}

func (h *AuthHandler) GetInfo(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"id":         user.ID,
		"email":      user.Email,
		"used_space": user.UsedSpace,
		"max_space":  user.MaxSpace,
		"created_at": user.CreatedAt,
	})
}

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
	rand.Read(rtBytes)
	refreshToken := hex.EncodeToString(rtBytes)

	user.RefreshToken = &refreshToken

	if err := h.DB.Save(&user).Error; err != nil {
		log.Printf("[ERROR] Login: Failed to save refresh token for %s: %v\n", req.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	setRefreshTokenCookie(c, refreshToken)

	log.Printf("[INFO] User %s logged in successfully", user.Email)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token":          accessToken,
		"encrypted_private_key": hex.EncodeToString(user.EncryptedPrivateKey),
		"iv":                    hex.EncodeToString(user.IV),
		"public_key":            hex.EncodeToString(user.PublicKey),
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
		saltHex = hex.EncodeToString(fakeSalt)

	} else {
		saltHex = hex.EncodeToString(user.ClientSalt)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"salt": saltHex,
	})
}

func (h *AuthHandler) RefreshToken(c fiber.Ctx) error {

	cookieToken := c.Cookies("refresh_token")

	if cookieToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "missing_refresh_token",
		})
	}

	var user models.User
	if err := h.DB.Where("refresh_token = ?", cookieToken).First(&user).Error; err != nil {

		clearRefreshTokenCookie(c)

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid_refresh_token",
		})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	log.Printf("[INFO] Access token refreshed for %s", user.Email)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token": accessToken,
	})
}

func (h *AuthHandler) LogoutUser(c fiber.Ctx) error {
	cookieToken := c.Cookies("refresh_token")

	if cookieToken == "" {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "already_logged_out",
		})
	}

	err := h.DB.Model(&models.User{}).
		Where("refresh_token = ?", cookieToken).
		Update("refresh_token", nil).Error

	if err != nil {
		log.Printf("[WARN] Logout: Could not clear token in DB: %v\n", err)
	}

	clearRefreshTokenCookie(c)

	log.Printf("[INFO] User logged out successfully (token cleared)")
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "logged_out_successfully",
	})
}

func (h *AuthHandler) DeleteUser(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	if err := h.DB.Where("id = ?", userID).Delete(&models.User{}).Error; err != nil {
		log.Printf("[ERROR] Failed to delete user %s: %v\n", userID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_delete_user"})
	}

	//TODO: delete files ect check if not last admin in org

	clearRefreshTokenCookie(c)

	log.Printf("[INFO] User %s deleted their account", userID)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "account_deleted_successfully",
	})
}

func (h *AuthHandler) UpdatePassword(c fiber.Ctx) error {
	req := new(UpdatePasswordRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if req.OldAuthHash == "" || req.NewAuthHash == "" || req.NewClientSalt == "" || req.NewIv == "" || req.NewEncryptedPrivKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_parameters"})
	}

	userID := c.Locals("user_id").(string)
	var user models.User

	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	if !verifyArgon2idHash(req.OldAuthHash, user.ServerSalt, user.AuthHash) {
		log.Printf("[WARN] Failed password update attempt for user %s", user.Email)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid_old_password"})
	}

	newServerHash, newServerSaltHex, err := hashWithArgon2id(req.NewAuthHash)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	newClientSalt, _ := hex.DecodeString(req.NewClientSalt)
	newServerSalt, _ := hex.DecodeString(newServerSaltHex)
	newIV, _ := hex.DecodeString(req.NewIv)
	newPrivKey, _ := hex.DecodeString(req.NewEncryptedPrivKey)

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"auth_hash":             newServerHash,
		"server_salt":           newServerSalt,
		"client_salt":           newClientSalt,
		"iv":                    newIV,
		"encrypted_private_key": newPrivKey,
		"refresh_token":         nil,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database_update_failed"})
	}

	//TODO: generate a new jwt and refresh token maybe
	clearRefreshTokenCookie(c)

	log.Printf("[INFO] Password successfully updated for user %s", user.Email)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "password_updated_please_login_again",
	})
}

func setRefreshTokenCookie(c fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   true, // test avec caddy
		SameSite: "Strict",
	})
}

func clearRefreshTokenCookie(c fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   true, // test avec caddy
		SameSite: "Strict",
	})
}
