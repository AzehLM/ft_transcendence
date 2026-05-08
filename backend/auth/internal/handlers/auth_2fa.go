package handlers

import (
	"backend/auth/internal/models"
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
)

var tempTOTPStore = make(map[string]tempTOTPData)

type tempTOTPData struct {
	Secret    string
	ExpiresAt time.Time
}


func (h *AuthHandler) GenerateTOTPSecret(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	if user.TwoFactorEnabled {
		log.Printf("[WARN] 2FA already enabled %s", user.ID)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "2FA_already_enabled"})
	}

	secret, url, err := h.TOTPService.GenerateTOTPSecret(user.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	tempTOTPStore[userID] = tempTOTPData{
		Secret:    secret,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"qrCodeURL": url,
		"secret":    secret,
		"message":   "Scan QR with authenticator app",
		"expiresIn": 300,
	})

}

func (h *AuthHandler) VerifyTOTPSetup(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	req := new(VerifyTOTPRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code_must_be_6_digits"})
	}

	code := req.Code

	data, exists := tempTOTPStore[userID]
	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No pending 2FA setup",
		})
	}

	if time.Now().After(data.ExpiresAt) {
		delete(tempTOTPStore, userID)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "TOTP_secret_expired",
			"message": "Setup window expired. Generate a new QR code.",
		})
	}

	secret := data.Secret

	if !h.TOTPService.VerifyTOTPCode(secret, code) {
		delete(tempTOTPStore, userID)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_code"})
	}

	encryptedSecret, err := encryptTOTPSecret(secret, user.ClientSalt, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "encryption_failed"})
	}

	recoveryCodes := h.TOTPService.GenerateRecoveryCodes(10)
	hashedCodes, err := h.TOTPService.HashRecoveryCodes(recoveryCodes)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "hashing_failed"})
	}

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"TwoFactorEnabled":    true,
		"TOTPSecretEncrypted": encryptedSecret,
		"RecoveryCodesHashed": hashedCodes,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database_update_failed"})
	}

	delete(tempTOTPStore, userID)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":       true,
		"recoveryCodes": recoveryCodes,
		"message":       "Save these 10 codes in a safe place offline!",
	})

}

func (h *AuthHandler) VerifyTOTPLogin(c fiber.Ctx) error {

	

}

func (h *AuthHandler) VerifyRecoveryCode(c fiber.Ctx) error {

}

func (h *AuthHandler) GetRecoveryCodes(c fiber.Ctx) error {

}

func (h *AuthHandler) DisableTwoFactor(c fiber.Ctx) error {

}
