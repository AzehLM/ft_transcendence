package handlers

import (
	"fmt"

	"backend/shared/config"
	"backend/storage/internal/service"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type StorageHandler struct {
	svc	service.StorageService
	env	*config.Env
}

func NewStorageHandler (svc service.StorageService, env *config.Env) *StorageHandler {
	return &StorageHandler{
		svc:	svc,
		env:	env,
	}
}

type finalizeRequest struct {
	ObjectID			uuid.UUID	`json:"object_id"`
	EncryptedFilename	string		`json:"encrypted_filename"` // filename encrypted client side
	EncryptedDEK		[]byte		`json:"encrypted_dek"`
	IV					[]byte		`json:"iv"`
	OrgID				*uuid.UUID	`json:"org_id"`
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
