package handlers

import (
	"backend/auth/internal/models"
	"backend/auth/internal/service"
	"backend/shared/config"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"strings"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WebAuthnHandler struct {
	WebAuthnService *service.WebAuthnService
	DB              *gorm.DB
	Env             *config.Env
}

// Request/Response structs
type BeginRegistrationRequest struct {
	// No body needed - user comes from context
}

type CompleteRegistrationRequest struct {
	AttestationResponse string `json:"attestationResponse"`
	DeviceName          string `json:"deviceName"`
}

type GenerateRecoveryKeyRequest struct {
	// No body needed
}

type BeginRegistrationResponse struct {
	Options interface{} `json:"options"`
}

type CompleteRegistrationResponse struct {
	Message string `json:"message"`
}

type GenerateRecoveryKeyResponse struct {
	RecoveryKey string `json:"recoveryKey"`
	Message     string `json:"message"`
}

func NewWebauthnHandler(db *gorm.DB, env *config.Env) *WebAuthnHandler {
	// Get WebAuthn config from environment
	rpID := env.WebAuthnRPID
	rpName := env.WebAuthnRPName
	origin := env.WebAuthnOrigin

	// Initialize WebAuthn service
	webauthnService, err := service.NewWebAuthnService(rpID, rpName, origin)
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize WebAuthn service: %v", err)
	}

	return &WebAuthnHandler{
		WebAuthnService: webauthnService,
		DB:              db,
		Env:             env,
	}
}

// BeginRegistration handles the first step of WebAuthn registration
func (h *WebAuthnHandler) BeginRegistration(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Fetch user from database
	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		log.Printf("[ERROR] User not found: %s\n", userID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	// Create WebAuthn user object for the library
	webauthnUser := &webauthn.User{
		ID:          []byte(userID),
		Name:        user.Email,
		DisplayName: user.Email,
	}

	// Generate registration options using WebAuthn service
	options, err := h.WebAuthnService.BeginRegistration(webauthnUser)
	if err != nil {
		log.Printf("[ERROR] Failed to generate registration options: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_generate_options"})
	}

	log.Printf("[INFO] Registration begun for user %s\n", user.Email)
	return c.Status(fiber.StatusOK).JSON(BeginRegistrationResponse{
		Options: options,
	})
}

// CompleteRegistration handles the second step of WebAuthn registration
func (h *WebAuthnHandler) CompleteRegistration(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Parse request
	req := new(CompleteRegistrationRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_payload"})
	}

	if req.AttestationResponse == "" || req.DeviceName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_attestation_or_device_name"})
	}

	// Fetch user from database
	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		log.Printf("[ERROR] User not found: %s\n", userID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	// Parse attestation response from frontend
	var attestationResponseJSON map[string]interface{}
	if err := json.Unmarshal([]byte(req.AttestationResponse), &attestationResponseJSON); err != nil {
		log.Printf("[ERROR] Failed to parse attestation response: %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_attestation_format"})
	}

	// Parse the attestation response using webauthn library
	parsedResponse, err := protocol.ParseCredentialCreationResponseBody(strings.NewReader(req.AttestationResponse))
	if err != nil {
		log.Printf("[ERROR] Failed to parse credential creation response: %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "failed_to_parse_response"})
	}

	// Create WebAuthn user object
	webauthnUser := &webauthn.User{
		ID:          []byte(userID),
		Name:        user.Email,
		DisplayName: user.Email,
	}

	// Get session data from service
	session, exists := h.WebAuthnService.GetSession(userID)
	if !exists {
		log.Printf("[ERROR] Session data not found for user %s\n", userID)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "session_expired"})
	}

	// Verify registration and extract credential
	credential, err := h.WebAuthnService.FinishRegistration(webauthnUser, session, parsedResponse)
	if err != nil {
		log.Printf("[ERROR] Failed to verify registration: %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_attestation"})
	}

	// Store credential in database
	newCredential := &models.Credential{
		ID:           uuid.New(),
		UserID:       user.ID,
		CredentialID: credential.ID,
		PublicKey:    credential.PublicKey,
		DeviceName:   req.DeviceName,
	}

	if err := h.DB.Create(newCredential).Error; err != nil {
		log.Printf("[ERROR] Failed to save credential: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_save_credential"})
	}

	// Update user's 2FA flag
	if err := h.DB.Model(&user).Update("two_factor_enabled", true).Error; err != nil {
		log.Printf("[ERROR] Failed to update 2FA flag: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_update_2fa_flag"})
	}

	log.Printf("[INFO] Registration completed for user %s with device %s\n", user.Email, req.DeviceName)
	return c.Status(fiber.StatusOK).JSON(CompleteRegistrationResponse{
		Message: "credential_registered_successfully",
	})
}

// GenerateRecoveryKey generates a recovery key for the user
func (h *WebAuthnHandler) GenerateRecoveryKey(c fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Fetch user from database
	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		log.Printf("[ERROR] User not found: %s\n", userID)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	// Generate random recovery key (32 bytes)
	recoveryKeyBytes := make([]byte, 32)
	if _, err := rand.Read(recoveryKeyBytes); err != nil {
		log.Printf("[ERROR] Failed to generate recovery key: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_generate_recovery_key"})
	}

	// Hash the recovery key with SHA-256
	hash := sha256.Sum256(recoveryKeyBytes)

	// Store hash in database
	if err := h.DB.Model(&user).Update("recovery_key_hash", hash[:]).Error; err != nil {
		log.Printf("[ERROR] Failed to store recovery key hash: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed_to_store_recovery_key"})
	}

	// Format recovery key for display (user-friendly format)
	recoveryKeyStr := formatRecoveryKey(recoveryKeyBytes)

	log.Printf("[INFO] Recovery key generated for user %s\n", user.Email)
	return c.Status(fiber.StatusOK).JSON(GenerateRecoveryKeyResponse{
		RecoveryKey: recoveryKeyStr,
		Message:     "recovery_key_generated_save_it_offline",
	})
}

// formatRecoveryKey formats recovery key bytes into a readable format
// e.g., "A3F2-91BC-4E07-D812-..."
func formatRecoveryKey(keyBytes []byte) string {
	encoded := base64.StdEncoding.EncodeToString(keyBytes)
	// Format as groups of 4 characters separated by dashes
	var result string
	for i := 0; i < len(encoded); i += 4 {
		if i > 0 {
			result += "-"
		}
		end := i + 4
		if end > len(encoded) {
			end = len(encoded)
		}
		result += encoded[i:end]
	}
	return result
}
