package handlers

import (
	"backend/auth/internal/models"
	"context"
	"encoding/base64"
	"io"
	"log"
	"net/http"
	"time"
	"errors"
	"gorm.io/gorm"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
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
	userIDStr := c.Locals("user_id").(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Printf("[WARN] invalid user_id %s: %v", userIDStr, err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_user_id"})
	}

	if err := h.Publisher.PublishUserDeleted(context.TODO(), userID); err != nil {
		log.Printf("[ERROR] Failed to publish user_deleted event for user %s: %v", userIDStr, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_publish_user_deleted_event"})
	}

	if err := h.DB.Where("id = ?", userIDStr).Delete(&models.User{}).Error; err != nil {
		log.Printf("[ERROR] Failed to delete user %s: %v\n", userIDStr, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_delete_user"})
	}

	clearRefreshTokenCookie(c)

	log.Printf("[INFO] User %s deleted their account", userIDStr)


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

	newClientSalt, err := base64.StdEncoding.DecodeString(req.NewClientSalt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_new_client_salt_format"})
	}

	newIV, err := base64.StdEncoding.DecodeString(req.NewIv)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_new_iv_format"})
	}

	newPrivKey, err := base64.StdEncoding.DecodeString(req.NewEncryptedPrivKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_new_private_key_format"})
	}

	newServerSalt, _ := base64.StdEncoding.DecodeString(newServerSaltHex)

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

func (h *AuthHandler) UploadAvatar(c fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_user_id"})
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no_file_uploaded"})
	}

	const maxSize = int64(4 * 1024 * 1024)
	if file.Size > maxSize {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "file_too_large_max_4mb"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_open_file"})
	}
	defer func() {
		if err := src.Close(); err != nil {
			log.Printf("[WARN] Failed to close avatar upload source: %v", err)
		}
	}()

	findExtension := make([]byte, 512)
	if _, err := src.Read(findExtension); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_read_file"})
	}

	// trying to sniff the extension type by reading bytes values, double security (MIME type has to be check in the front first)
	contentType := http.DetectContentType(findExtension)

	// only accepting jpeg or png for now
	if contentType != "image/jpeg" && contentType != "image/png" {
		return c.Status(fiber.StatusUnsupportedMediaType).JSON(fiber.Map{"error": "invalid_file_type_jpeg_or_png_only"})
	}

	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_read_file"})
	}
	data, err := io.ReadAll(src)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could_not_read_file"})
	}

	avatar := models.UserAvatar{
		UserID:      userID,
		Data:        data,
		ContentType: contentType,
		UpdatedAt:   time.Now(),
	}

	result := h.DB.Save(&avatar)
	if result.Error != nil {
		log.Printf("[ERROR] Failed to save avatar for user %s: %v", userIDStr, result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database_error"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "avatar_uploaded_successfully",
	})
}

func (h *AuthHandler) GetUserPublicKey(c fiber.Ctx) error {
	email := c.Query("email")
	if email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email is required"})
	}

	var user models.User
	err := h.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"public_key": base64.StdEncoding.EncodeToString(user.PublicKey),
	})
}
