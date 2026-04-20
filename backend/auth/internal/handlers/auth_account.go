package handlers

import (
    "backend/auth/internal/models"
    "bytes"
    "context"
    "encoding/base64"
    "fmt"
    "io"
    "log"
    "net/http"
    "time"

    "github.com/gofiber/fiber/v3"
    "github.com/minio/minio-go/v7"
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
	userID := c.Locals("user_id").(string)
	var user models.User

	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	file, err := c.FormFile("avatar")

	if (err != nil) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "no file uploaded"})
	}

	maxSize := int64(5 * 1024 * 1024)
	fileSize := file.Size

	if (file.Size > maxSize) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "file too large, bigger than 5MB"})
	}

	filename := fmt.Sprintf("avatars/%s-%d.jpg", userID, time.Now().Unix())

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	buffer := make([]byte, 512)
	src.Read(buffer)

	realType := http.DetectContentType(buffer)

	if realType != "image/jpeg" && realType != "image/png" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "invalid file type, should be png or jpeg"})
	}

	src.Seek(0, 0)
	fullBuffer, err := io.ReadAll(src)
	if err != nil {
		return err
	}

	ctx := context.TODO()
	_, err = h.MinioClient.PutObject(
		ctx,
		"ostrom",
		filename,
		bytes.NewReader(fullBuffer),
		fileSize,
		minio.PutObjectOptions{},
	)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed_to_upload_avatar",
		})
	}

	avatarURL := fmt.Sprintf("https://minio/ostrom/%s", filename)

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"avatar_url": avatarURL,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database_update_failed"})
	}

	log.Printf("[INFO] Avatar successfully uploaded for user %s", user.Email)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":    "avatar_uploaded_successfully",
		"avatar_url": avatarURL,
	})
}