package handlers

import (
	"fmt"

	"backend/storage/internal/service"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type StorageHandler struct {
	svc service.StorageService
}

func NewStorageHandler (svc service.StorageService) *StorageHandler {
	return &StorageHandler{
		svc: svc,
	}
}

type finalizeRequest struct {

}

func (h *StorageHandler) extractUserID(c fiber.Ctx) (uuid.UUID, error) {

	userIDstr, ok := c.Locals("user_id").(string)
	if !ok || userIDstr == "" {
		return uuid.Nil, fmt.Errorf("user_id missing or invalid")
	}

	userID, err := uuid.Parse(userIDstr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("user_id is not a valid UUID")
	}

	return userID, nil
}
