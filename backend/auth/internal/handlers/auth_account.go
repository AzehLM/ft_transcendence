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

	err := h.DB.Select("id", "email", "used_space", "max_space", "created_at", "first_name", "family_name").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"id":         user.ID,
		"email":      user.Email,
		"used_space": user.UsedSpace,
		"max_space":  user.MaxSpace,
		"created_at": user.CreatedAt,
		"first_name": user.FirstName,
		"family_name": user.FamilyName,
	})
}

func (h *AuthHandler) DeleteUser(c fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Printf("[WARN] invalid user_id %s: %v", userIDStr, err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user id"})
	}

	var orgIDs []string
	var orgsToDelete []uuid.UUID

	errTx := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("org_members").Where("user_id = ?", userID).Pluck("org_id", &orgIDs).Error; err != nil {
			return err
		}

		for _, orgIDStr := range orgIDs {
			var otherAdminsCount int64
			if err := tx.Table("org_members").
				Where("org_id = ? AND role = ? AND user_id != ?", orgIDStr, "admin", userID).
				Count(&otherAdminsCount).Error; err != nil {
				return err
			}

			if otherAdminsCount > 0 {
				continue
			}

			type MemberInfo struct {
				UserID   uuid.UUID `gorm:"column:user_id"`
				JoinedAt time.Time `gorm:"column:joined_at"`
			}

			var oldestMember MemberInfo
			errQuery := tx.Table("org_members").
				Select("user_id, joined_at").
				Where("org_id = ? AND user_id != ?", orgIDStr, userID).
				Order("joined_at ASC").
				Limit(1).
				Take(&oldestMember).Error

			if errQuery == nil {
				if err := tx.Table("org_members").
					Where("org_id = ? AND user_id = ?", orgIDStr, oldestMember.UserID).
					Update("role", "admin").Error; err != nil {
					return err
				}
			} else if errors.Is(errQuery, gorm.ErrRecordNotFound) {
				if err := tx.Table("organizations").Where("id = ?", orgIDStr).Delete(nil).Error; err != nil {
					return err
				}
				orgUUID, errParse := uuid.Parse(orgIDStr)
				if errParse == nil {
					orgsToDelete = append(orgsToDelete, orgUUID)
				}
			} else {
				return errQuery
			}
		}

		if err := tx.Where("id = ?", userIDStr).Delete(&models.User{}).Error; err != nil {
			return err
		}

		return nil
	})

	if errTx != nil {
		log.Printf("[ERROR] Transaction failed for user deletion %s: %v", userIDStr, errTx)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not delete user"})
	}

	if err := h.Publisher.PublishUserDeleted(context.TODO(), userID); err != nil {
		log.Printf("[ERROR] Failed to publish user_deleted event for user %s: %v", userIDStr, err)
	}

	// for _, orgUUID := range orgsToDelete {
	// 	if err := h.Publisher.PublishOrgDeleted(context.TODO(), orgUUID); err != nil {
	// 		log.Printf("[ERROR] Failed to publish org_deleted event for org %s: %v", orgUUID, err)
	// 	}
	// }

	var remainingOrgIDs []string
	for _, orgIDStr := range orgIDs {
		isDeleted := false
		for _, orgUUID := range orgsToDelete {
			if orgUUID.String() == orgIDStr {
				isDeleted = true
				break
			}
		}
		if !isDeleted {
			remainingOrgIDs = append(remainingOrgIDs, orgIDStr)
		}
	}

	if len(remainingOrgIDs) > 0 {
		if err := h.Publisher.PublishMemberRemoved(context.TODO(), userID, remainingOrgIDs); err != nil {
			log.Printf("[WARN] Failed to publish MEMBER_REMOVED events for user %s: %v", userID, err)
		}
	}

	clearRefreshTokenCookie(c)

	log.Printf("[INFO] User %s deleted their account", userIDStr)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "account deleted successfully",
	})
}

func (h *AuthHandler) UpdatePassword(c fiber.Ctx) error {
	req := new(UpdatePasswordRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if req.OldAuthHash == "" || req.NewAuthHash == "" || req.NewClientSalt == "" || req.NewIv == "" || req.NewEncryptedPrivKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing parameters"})
	}

	userID := c.Locals("user_id").(string)
	var user models.User

	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	if !verifyArgon2idHash(req.OldAuthHash, user.ServerSalt, user.AuthHash) {
		log.Printf("[WARN] Failed password update attempt for user %s", user.Email)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid old password"})
	}

	newServerHash, newServerSaltHex, err := hashWithArgon2id(req.NewAuthHash)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

	newClientSalt, err := base64.StdEncoding.DecodeString(req.NewClientSalt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid new client salt format"})
	}

	newIV, err := base64.StdEncoding.DecodeString(req.NewIv)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid new iv format"})
	}

	newPrivKey, err := base64.StdEncoding.DecodeString(req.NewEncryptedPrivKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid new private key format"})
	}

	newServerSalt, _ := base64.StdEncoding.DecodeString(newServerSaltHex)

	err = h.DB.Model(&user).Updates(map[string]interface{}{
		"auth_hash":             newServerHash,
		"server_salt":           newServerSalt,
		"client_salt":           newClientSalt,
		"iv":                    newIV,
		"encrypted_private_key": newPrivKey,
	}).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database update failed"})
	}

	log.Printf("[INFO] Password successfully updated for user %s", user.Email)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "password updated",
	})
}

func (h *AuthHandler) UploadAvatar(c fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user id"})
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no file uploaded"})
	}

	const maxSize = int64(4 * 1024 * 1024)
	if file.Size > maxSize {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "file too large max 4mb"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not open file"})
	}
	defer func() {
		if err := src.Close(); err != nil {
			log.Printf("[WARN] Failed to close avatar upload source: %v", err)
		}
	}()

	findExtension := make([]byte, 512)
	if _, err := src.Read(findExtension); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not read file"})
	}

	// trying to sniff the extension type by reading bytes values, double security (MIME type has to be check in the front first)
	contentType := http.DetectContentType(findExtension)

	// only accepting jpeg or png for now
	if contentType != "image/jpeg" && contentType != "image/png" {
		return c.Status(fiber.StatusUnsupportedMediaType).JSON(fiber.Map{"error": "invalid file type jpeg or png only"})
	}

	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not read file"})
	}
	data, err := io.ReadAll(src)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not read file"})
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error yo"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "avatar uploaded successfully",
	})
}

// method for authenticated user's avatar bytes with the correct Content-Type.
func (h *AuthHandler) GetMyAvatar(c fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	return serveAvatar(c, h.DB, userIDStr)
}

// method for any user's avatar bytes — public endpoint (already behind JWT middleware).
func (h *AuthHandler) GetUserAvatar(c fiber.Ctx) error {
	targetID := c.Params("id")
	if _, err := uuid.Parse(targetID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid user id"})
	}
	return serveAvatar(c, h.DB, targetID)
}

// do we really want to keep both GetMyAvatar and GetUserAvatar ? Both returns the same values

func serveAvatar(c fiber.Ctx, db *gorm.DB, userIDStr string) error {
	var avatar models.UserAvatar

	err := db.Where("user_id = ?", userIDStr).First(&avatar).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no avatar"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error yo 2"})
	}

	// Content-type so the frontend can sanitize again the output of the API call
	// Last-Modified and Cache-Control for cache purposes
	c.Set("Content-Type", avatar.ContentType)
	c.Set("Cache-Control", "public, max-age=3600")
	c.Set("Last-Modified", avatar.UpdatedAt.UTC().Format(http.TimeFormat))
	return c.Status(fiber.StatusOK).Send(avatar.Data)
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
	}

    return c.Status(fiber.StatusOK).JSON(fiber.Map{
        "public_key": base64.StdEncoding.EncodeToString(user.PublicKey),
    })
}

func (h *AuthHandler) ChangeFirstName(c fiber.Ctx) error {
	var body struct {
		FirstName string `json:"first_name" validate:"required"`
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request body is empty",
		})
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// if body.FirstName == "" {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error": "first name required",
	// 	})
	// }

	userIDLocals, err := c.Locals("user_id").(string)
	if !err {
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
	}

	result := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("first_name", body.FirstName)
    if result.Error != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": result.Error.Error(),
        })
    }
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	var user models.User
	if errDb := h.DB.Select("first_name", "family_name").First(&user, userID).Error; errDb == nil {
		var orgIDs []string
		if errOrgs := h.DB.Table("org_members").Where("user_id = ?", userID).Pluck("org_id", &orgIDs).Error; errOrgs == nil {
			_ = h.Publisher.PublishUserProfileUpdated(c.Context(), userID, orgIDs, user.FirstName, user.FamilyName)
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "first name updated",
	})
}

func (h *AuthHandler) ChangeFamilyName(c fiber.Ctx) error {
	var body struct {
		FamilyName string `json:"family_name" validate:"required"`
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request body is empty",
		})
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// if body.FamilyName == "" {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error": "family name required",
	// 	})
	// }

	userIDLocals, err := c.Locals("user_id").(string)
	if !err {
		return c.Status(fiber.StatusBadRequest).SendString("invalid user_id type")
	}

	userID, errUser := uuid.Parse(userIDLocals)
	if errUser != nil {
		return c.Status(fiber.StatusBadRequest).SendString("invalid UUID for user")
	}

	result := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("family_name", body.FamilyName)
    if result.Error != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": result.Error.Error(),
        })
    }
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	var user models.User
	if errDb := h.DB.Select("first_name", "family_name").First(&user, userID).Error; errDb == nil {
		var orgIDs []string
		if errOrgs := h.DB.Table("org_members").Where("user_id = ?", userID).Pluck("org_id", &orgIDs).Error; errOrgs == nil {
			_ = h.Publisher.PublishUserProfileUpdated(c.Context(), userID, orgIDs, user.FirstName, user.FamilyName)
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "family name updated",
	})
}
