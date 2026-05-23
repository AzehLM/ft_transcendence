package handlers

import (
	"backend/auth/internal/models"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"log"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

var (
	tempTOTPStoreMutex sync.RWMutex
	tempTOTPStore      = make(map[string]tempTOTPData)

	failedAttemptsMutex sync.RWMutex
	failedAttempts      = make(map[string]failedAttempt)
)

type tempTOTPData struct {
	Secret    string
	ExpiresAt time.Time
}

type failedAttempt struct {
	Count       int
	LockedUntil time.Time
}

const maxAttempts = 3
const lockoutDuration = 5 * time.Minute

func (h *AuthHandler) GenerateTOTPSecret(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	if user.TwoFactorEnabled {
		log.Printf("[WARN] 2FA already enabled %s", user.ID)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "2FA already enabled"})
	}

	secret, url, err := h.TOTPService.GenerateTOTPSecret(user.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	tempTOTPStoreMutex.Lock()
	tempTOTPStore[userID] = tempTOTPData{
		Secret:    secret,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	tempTOTPStoreMutex.Unlock()

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

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at", "client_salt").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	// Check if user is locked out
	failedAttemptsMutex.RLock()
	attempt, exists := failedAttempts[userID]
	failedAttemptsMutex.RUnlock()

	if exists {
		if time.Now().Before(attempt.LockedUntil) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too many attempts",
				"message": "Too many failed attempts. Generate a new QR code.",
			})
		}
		failedAttemptsMutex.Lock()
		delete(failedAttempts, userID)
		failedAttemptsMutex.Unlock()
	}

	req := new(VerifyTOTPRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code must be 6 digits"})
	}

	code := req.Code

	tempTOTPStoreMutex.RLock()
	data, exists := tempTOTPStore[userID]
	tempTOTPStoreMutex.RUnlock()

	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No pending 2FA setup",
		})
	}

	if time.Now().After(data.ExpiresAt) {
		tempTOTPStoreMutex.Lock()
		delete(tempTOTPStore, userID)
		tempTOTPStoreMutex.Unlock()
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "TOTP secret expired",
			"message": "Setup window expired. Generate a new QR code.",
		})
	}

	secret := data.Secret

	if !h.TOTPService.VerifyTOTPCode(secret, code) {
		failedAttemptsMutex.Lock()
		attempt := failedAttempts[userID]
		attempt.Count++
		if attempt.Count >= maxAttempts {
			attempt.LockedUntil = time.Now().Add(lockoutDuration)
			failedAttempts[userID] = attempt
			failedAttemptsMutex.Unlock()

			tempTOTPStoreMutex.Lock()
			delete(tempTOTPStore, userID)
			tempTOTPStoreMutex.Unlock()

			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too many attempts",
			})
		}
		failedAttempts[userID] = attempt
		failedAttemptsMutex.Unlock()

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":              "invalid_code",
			"attempts_remaining": maxAttempts - attempt.Count,
		})
	}

	failedAttemptsMutex.Lock()
	delete(failedAttempts, userID)
	failedAttemptsMutex.Unlock()

	tempTOTPStoreMutex.Lock()
	delete(tempTOTPStore, userID)
	tempTOTPStoreMutex.Unlock()

	encryptedSecret, err := encryptTOTPSecret(secret, user.ClientSalt, user.ID.String())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "encryption failed"})
	}

	// Base64 encode encrypted secret for safe database storage
	encryptedSecretBase64 := []byte(base64.StdEncoding.EncodeToString(encryptedSecret))

	recoveryCodes, err := h.TOTPService.GenerateRecoveryCodes(10)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "generating recovery codes failed"})
	}
	hashedCodesJSON, err := h.TOTPService.HashRecoveryCodes(recoveryCodes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "hashing failed"})
	}

	// Base64 encode the already-marshaled JSON for safe database storage
	recoveryCodesBase64 := []byte(base64.StdEncoding.EncodeToString(hashedCodesJSON))

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"TwoFactorEnabled":    true,
		"TOTPSecretEncrypted": encryptedSecretBase64,
		"RecoveryCodesHashed": recoveryCodesBase64,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database update failed"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":       true,
		"recoveryCodes": recoveryCodes,
		"message":       "Save these 10 codes in a safe place offline!",
	})

}

func (h *AuthHandler) VerifyTOTPLogin(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at", "client_salt", "totp_secret_encrypted").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	failedAttemptsMutex.RLock()
	attempt, exists := failedAttempts[userID]
	failedAttemptsMutex.RUnlock()

	if exists {
		if time.Now().Before(attempt.LockedUntil) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too many attempts",
				"message": "Too many failed attempts. Try again later.",
			})
		}
		failedAttemptsMutex.Lock()
		delete(failedAttempts, userID)
		failedAttemptsMutex.Unlock()
	}

	req := new(VerifyTOTPRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code must be 6 digits"})
	}

	code := req.Code

	// Base64 decode the stored encrypted secret
	encryptedSecret, err := base64.StdEncoding.DecodeString(string(user.TOTPSecretEncrypted))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "decryption failed"})
	}

	secret, err := decryptTOTPSecret(encryptedSecret, user.ClientSalt, user.ID.String())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "decryption failed"})
	}

	if !h.TOTPService.VerifyTOTPCode(secret, code) {
		failedAttemptsMutex.Lock()
		attempt := failedAttempts[userID]
		attempt.Count++
		if attempt.Count >= maxAttempts {
			attempt.LockedUntil = time.Now().Add(lockoutDuration)
			failedAttempts[userID] = attempt
			failedAttemptsMutex.Unlock()

			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too_many attempts",
			})
		}
		failedAttempts[userID] = attempt
		failedAttemptsMutex.Unlock()

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":              "invalid code",
			"attempts_remaining": maxAttempts - attempt.Count,
		})
	}

	failedAttemptsMutex.Lock()
	delete(failedAttempts, userID)
	failedAttemptsMutex.Unlock()

	// Create access token with 15 minutes expiration (matching normal login)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token generation failed"})
	}

	// Generate refresh token (32 bytes)
	rtBytes := make([]byte, 32)
	if _, err := rand.Read(rtBytes); err != nil {
		log.Printf("[ERROR] VerifyTOTPLogin: Failed to generate refresh token for %s: %v\n", user.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	rawRefreshToken := hex.EncodeToString(rtBytes)

	// Hash and save refresh token to database
	hashedRefreshToken := hashToken(rawRefreshToken)

	if err := h.DB.Model(&user).Update("refresh_token", hashedRefreshToken).Error; err != nil {
		log.Printf("[ERROR] VerifyTOTPLogin: Failed to save refresh token for %s: %v\n", user.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	// Set refresh token cookie
	setRefreshTokenCookie(c, rawRefreshToken)

	log.Printf("[INFO] User %s logged in via 2FA successfully", user.Email)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token":          accessToken,
		"encrypted_private_key": base64.StdEncoding.EncodeToString(user.EncryptedPrivateKey),
		"iv":                    base64.StdEncoding.EncodeToString(user.IV),
		"public_key":            base64.StdEncoding.EncodeToString(user.PublicKey),
	})
}

func parseRecoveryCodes(hashedCodesBase64 []byte) [][]byte {
	// Base64 decode first
	decodedJSON, err := base64.StdEncoding.DecodeString(string(hashedCodesBase64))
	if err != nil {
		log.Printf("[ERROR] Failed to base64 decode recovery codes: %v", err)
		return [][]byte{}
	}

	// Then unmarshal JSON
	var codes [][]byte
	err = json.Unmarshal(decodedJSON, &codes)
	if err != nil {
		return [][]byte{}
	}
	return codes
}

func (h *AuthHandler) VerifyRecoveryCode(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at", "recovery_codes_hashed").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	req := new(VerifyTOTPRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if len(req.Code) != 11 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code must be 11 characters"})
	}

	givenCode := req.Code
	userCodes := parseRecoveryCodes(user.RecoveryCodesHashed)

	failedAttemptsMutex.RLock()
	attempt, exists := failedAttempts[userID]
	failedAttemptsMutex.RUnlock()

	if exists {
		if time.Now().Before(attempt.LockedUntil) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too many attempts",
				"message": "Too many failed attempts. Try again later.",
			})
		}
		failedAttemptsMutex.Lock()
		delete(failedAttempts, userID)
		failedAttemptsMutex.Unlock()
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
		failedAttemptsMutex.Lock()
		attempt := failedAttempts[userID]
		attempt.Count++
		if attempt.Count >= maxAttempts {
			attempt.LockedUntil = time.Now().Add(lockoutDuration)
			failedAttempts[userID] = attempt
			failedAttemptsMutex.Unlock()

			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too many attempts",
			})
		}
		failedAttempts[userID] = attempt
		failedAttemptsMutex.Unlock()

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":              "invalid recovery code",
			"attempts_remaining": maxAttempts - attempt.Count,
		})
	}

	failedAttemptsMutex.Lock()
	delete(failedAttempts, userID)
	failedAttemptsMutex.Unlock()

	remainingCodesJSON, err := json.Marshal(remainingCodes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "serialization failed"})
	}

	// Base64 encode for safe database storage (same format as setup)
	remainingCodesBase64 := []byte(base64.StdEncoding.EncodeToString(remainingCodesJSON))

	err = h.DB.Model(&user).Update("RecoveryCodesHashed", remainingCodesBase64).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database update failed"})
	}

	// Create access token with 15 minutes expiration (matching normal login)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    user.ID.String(),
		"user_email": user.Email,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})

	jwtSecret := []byte(h.Env.JwtSecret)
	accessToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token generation failed"})
	}

	// Generate refresh token (32 bytes)
	rtBytes := make([]byte, 32)
	if _, err := rand.Read(rtBytes); err != nil {
		log.Printf("[ERROR] VerifyRecoveryCode: Failed to generate refresh token for %s: %v\n", user.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}
	rawRefreshToken := hex.EncodeToString(rtBytes)

	// Hash and save refresh token to database
	hashedRefreshToken := hashToken(rawRefreshToken)

	if err := h.DB.Model(&user).Update("refresh_token", hashedRefreshToken).Error; err != nil {
		log.Printf("[ERROR] VerifyRecoveryCode: Failed to save refresh token for %s: %v\n", user.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	// Set refresh token cookie
	setRefreshTokenCookie(c, rawRefreshToken)

	log.Printf("[INFO] User %s logged in via recovery code successfully", user.Email)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token":          accessToken,
		"remaining":             len(remainingCodes),
		"warning":               "Use an authenticator app to add a new recovery code",
		"encrypted_private_key": base64.StdEncoding.EncodeToString(user.EncryptedPrivateKey),
		"iv":                    base64.StdEncoding.EncodeToString(user.IV),
		"public_key":            base64.StdEncoding.EncodeToString(user.PublicKey),
	})

}

func (h *AuthHandler) GetRecoveryCodes(c fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var user models.User

	err := h.DB.Select("id", "email", "two_factor_enabled", "recovery_codes_hashed").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	if !user.TwoFactorEnabled {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "two factor not enabled"})
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
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	req := new(DisableTwoFactorRequest)

	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password required"})
	}

	if !verifyArgon2idHash(req.Password, user.ServerSalt, user.AuthHash) {
		log.Printf("[WARN] Failed to disable 2FA for %s: wrong password", user.ID)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid password"})
	}

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"TwoFactorEnabled":    false,
		"TOTPSecretEncrypted": nil,
		"RecoveryCodesHashed": nil,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database update failed"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "2FA has been disabled",
	})
}
