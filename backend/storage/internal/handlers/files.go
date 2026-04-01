package handlers

import (
	"errors"

	"backend/storage/internal/service"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func (h *StorageHandler) RequestUploadURL(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var body struct {
		FileSize int64		`json:"file_size" validate:"required"`
		FolderID *uuid.UUID	`json:"folder_id,omitempty"`
		OrgID    *uuid.UUID	`json:"org_id,omitempty"`
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "missing request body",
		})
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if body.FileSize <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "fileSize is required",
		})
	}

	presignedURL, objectID, err := h.svc.RequestUploadURL(userID, body.FileSize, body.FolderID, body.OrgID)
	if err != nil {
		if errors.Is(err, service.ErrQuotaExceeded) { // for when quota will be implemented
			return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "quota exceeded"})
		} else { // do we ever want to return a 500 ? hmmmm
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"presigned_url":	presignedURL,
		"object_id":		objectID,
	})
}
