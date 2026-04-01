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


func (h *StorageHandler) FinalizeUpload(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "missing request body",
		})
	}

	var req finalizeRequest

	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := h.svc.FinalizeUpload(userID, req.ObjectID, req.EncryptedFilename, req.EncryptedDEK, req.IV, req.OrgID); err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
		}
	}

	return c.SendStatus(fiber.StatusCreated)
}

func (h *StorageHandler) DownloadFile(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	fileID, err := uuid.Parse(c.Params("file_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid file_id",
		})
	}

	presignedURL, encryptedDEK, iv, fileName, err := h.svc.DownloadFile(userID, fileID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNotFound):
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
		case errors.Is(err, service.ErrForbidden):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"presigned_url":		presignedURL,
		"encrypted_dek":		encryptedDEK,
		"iv":					iv,
		"encrypted_filename":	fileName,
	})
}
