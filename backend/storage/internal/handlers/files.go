package handlers

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func (h *StorageHandler) RequestUploadURL(c fiber.Ctx) error {

	userIDStr, ok := c.Locals("user_id").(string)
	if !ok || userIDStr == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "user_id missing or invalid",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "user_id is not a valid UUID",
		})
	}

	var body struct {
		FileSize int64     `json:"file_size" validate:"required"`
		FolderID *uuid.UUID `json:"folder_id,omitempty"`
		OrgID    *uuid.UUID `json:"org_id,omitempty"`
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"presigned_url":	presignedURL,
		"object_id":		objectID,
	})
}
