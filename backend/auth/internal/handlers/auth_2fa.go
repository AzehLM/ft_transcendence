package handlers

import (
	"backend/auth/internal/models"
	"encoding/json"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

var tempTOTPStore = make(map[string]tempTOTPData)

type tempTOTPData struct {
	Secret    string
	ExpiresAt time.Time
}

type failedAttempt struct {
	Count       int
	LockedUntil time.Time
}

var failedAttempts = make(map[string]failedAttempt)

const maxAttempts = 3
const lockoutDuration = 5 * time.Minute

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

	// Check if user is locked out
	if attempt, exists := failedAttempts[userID]; exists {
		if time.Now().Before(attempt.LockedUntil) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too_many_attempts",
				"message": "Too many failed attempts. Generate a new QR code.",
			})
		}
		delete(failedAttempts, userID)
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
		attempt := failedAttempts[userID]
		attempt.Count++
		failedAttempts[userID] = attempt

		if attempt.Count >= maxAttempts {
			failedAttempts[userID] = failedAttempt{
				Count:       attempt.Count,
				LockedUntil: time.Now().Add(lockoutDuration),
			}
			delete(tempTOTPStore, userID)
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too_many_attempts",
			})
		}

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":              "invalid_code",
			"attempts_remaining": maxAttempts - attempt.Count,
		})
	}
	delete(failedAttempts, userID)

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

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	if attempt, exists := failedAttempts[userID]; exists {
		if time.Now().Before(attempt.LockedUntil) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too_many_attempts",
				"message": "Too many failed attempts. Try again later.",
			})
		}
		delete(failedAttempts, userID)
	}

	req := new(VerifyTOTPRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code_must_be_6_digits"})
	}

	code := req.Code

	secret, err := decryptTOTPSecret(user.TOTPSecretEncrypted, user.ClientSalt, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "decryption_failed"})
	}

	if !h.TOTPService.VerifyTOTPCode(secret, code) {
		attempt := failedAttempts[userID]
		attempt.Count++
		failedAttempts[userID] = attempt

		if attempt.Count >= maxAttempts {
			failedAttempts[userID] = failedAttempt{
				Count:       attempt.Count,
				LockedUntil: time.Now().Add(lockoutDuration),
			}
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too_many_attempts",
			})
		}

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":              "invalid_code",
			"attempts_remaining": maxAttempts - attempt.Count,
		})
	}

	delete(failedAttempts, userID)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	fullToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"token":   fullToken,
		"message": "Logged in successfully",
	})
}

func parseRecoveryCodes(hashedCodesJSON []byte) [][]byte {
	var codes [][]byte
	err := json.Unmarshal(hashedCodesJSON, &codes)
	if err != nil {
		log.Printf("[ERROR] Failed to parse recovery codes: %v", err)
		return [][]byte{}
	}
	return codes
}

func (h *AuthHandler) VerifyRecoveryCode(c fiber.Ctx) error {

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

	if len(req.Code) != 11 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code_must_be_11_characters"})
	}

	givenCode := req.Code
	userCodes := parseRecoveryCodes(user.RecoveryCodesHashed)

	if attempt, exists := failedAttempts[userID]; exists {
		if time.Now().Before(attempt.LockedUntil) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too_many_attempts",
				"message": "Too many failed attempts. Try again later.",
			})
		}
		delete(failedAttempts, userID)
	}

	var remainingCodes [][]byte
	codeFound := false

	for i, storedHash := range userCodes {
		if bcrypt.CompareHashAndPassword(storedHash, []byte(givenCode)) == nil {
			remainingCodes = append(userCodes[:i], userCodes[i+1:]...)
			codeFound = true
			break
		}
	}

	if !codeFound {
		attempt := failedAttempts[userID]
		attempt.Count++
		failedAttempts[userID] = attempt

		if attempt.Count >= maxAttempts {
			failedAttempts[userID] = failedAttempt{
				Count:       attempt.Count,
				LockedUntil: time.Now().Add(lockoutDuration),
			}
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too_many_attempts",
			})
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":              "invalid_recovery_code",
			"attempts_remaining": maxAttempts - attempt.Count,
		})
	}
	delete(failedAttempts, userID)

	remainingCodesJSON, err := json.Marshal(remainingCodes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "serialization_failed"})
	}

	err = h.DB.Model(&user).Update("RecoveryCodesHashed", remainingCodesJSON).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database_update_failed"})
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	fullToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_generation_failed"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"token":     fullToken,
		"remaining": len(remainingCodes),
		"warning":   "Use an authenticator app to add a new recovery code",
	})

}

func (h *AuthHandler) GetRecoveryCodes(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "two_factor_enabled", "recovery_codes_hashed").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	if !user.TwoFactorEnabled {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "two_factor_not_enabled"})
	}

	userCodes := parseRecoveryCodes(user.RecoveryCodesHashed)

	remaining := len(userCodes)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"enabled":   true,
		"remaining": remaining,
		"message":   "You have backup codes remaining",
	})
}

type DisableTwoFactorRequest struct {
	Password string `json:"password"`
}

func (h *AuthHandler) DisableTwoFactor(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "auth_hash", "server_salt").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	req := new(DisableTwoFactorRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password_required"})
	}

	if !verifyArgon2idHash(req.Password, user.ServerSalt, user.AuthHash) {
		log.Printf("[WARN] Failed to disable 2FA for %s: wrong password", user.ID)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_password"})
	}

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"TwoFactorEnabled":    false,
		"TOTPSecretEncrypted": nil,
		"RecoveryCodesHashed": nil,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database_update_failed"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "2FA has been disabled",
	})
}
