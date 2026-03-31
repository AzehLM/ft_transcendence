package handlers

import (
	"backend/storage/internal/service"
)

type StorageHandler struct {
	svc service.StorageService
}

func NewStorageHandler (svc service.StorageService) *StorageHandler {
	return &StorageHandler{
		svc: svc,
	}
}

type uploadURLRequest struct {

}

type finalizeRequest struct {

}

func (h *StorageHandler) extractUserID

func (svc *StorageHandler)
