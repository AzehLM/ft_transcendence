package handlers

import (
	"errors"

	files "backend/storage/internal"
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
		if errors.Is(err, service.ErrQuotaExceeded) {
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

	var body finalizeRequest

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var fileID uuid.UUID

	fileID, err = h.svc.FinalizeUpload(userID, body.ObjectID, body.EncryptedFilename, body.EncryptedDEK, body.IV, body.OrgID)
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

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"file_id": fileID,
	})
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

func (h *StorageHandler) DeleteFile(c fiber.Ctx) error {

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

	if err := h.svc.DeleteFile(userID, fileID); err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
		}
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *StorageHandler) MoveFile(c fiber.Ctx) error {

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

	// commented as the body could be empty, but that would mean we would ALWAYS move the file to the root of their space
	// need to talk about that with everyone
	// if len(c.Body()) == 0 {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error": "missing request body",
	// 	})
	// }

	var body struct {
		FolderID *uuid.UUID `json:"folder_id"`
	}

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := h.svc.MoveFile(userID, fileID, body.FolderID); err != nil {
		switch {
		case errors.Is(err, service.ErrNotFound):
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not_found"})
		case errors.Is(err, service.ErrForbidden):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error"})
		}
	}

	return c.SendStatus(fiber.StatusOK)
}

// call to GetFileInfo from service returns a File so I can modulate the return value depending on needs
func (h *StorageHandler) GetFileInfo(c fiber.Ctx) error {

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

	var file *files.File
	file, err = h.svc.GetFileInfo(userID, fileID)
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
		"file_size":			file.FileSize,
		"created_at":			file.CreatedAt,
		"encrypted_filename":	file.Name,
	})
}
