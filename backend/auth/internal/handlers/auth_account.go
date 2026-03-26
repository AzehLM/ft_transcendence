package handlers

import (
	"backend/auth/internal/models"
	"encoding/hex"
	"log"

	"github.com/gofiber/fiber/v3"
)

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

	newClientSalt, err := hex.DecodeString(req.NewClientSalt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_new_client_salt_format"})
	}

	newIV, err := hex.DecodeString(req.NewIv)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_new_iv_format"})
	}

	newPrivKey, err := hex.DecodeString(req.NewEncryptedPrivKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_new_private_key_format"})
	}

	newServerSalt, _ := hex.DecodeString(newServerSaltHex)

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
