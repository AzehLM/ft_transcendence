package handlers

import (
	"encoding/json"
	"errors"

	storage "backend/storage/internal"
	"backend/storage/internal/service"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func (h *StorageHandler) CreateFolder(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var body struct {
		Name		string		`json:"name"`
		ParentID	*uuid.UUID	`json:"parent_id,omitempty"`
		OrgID		*uuid.UUID	`json:"org_id,omitempty"`
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

	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "name is required",
		})
	}

	ID, err := h.svc.CreateFolder(userID, body.Name, body.ParentID, body.OrgID)
	if err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			case errors.Is(err, service.ErrInvalidParent):
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid parent"})
			case errors.Is(err, service.ErrInvalidName):
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder name"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":	ID,
		"name":	body.Name,
	})
}

func (h *StorageHandler) DeleteFolder(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	folderID, err := uuid.Parse(c.Params("folder_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid folder_id",
		})
	}

	if err := h.svc.DeleteFolder(userID, folderID); err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			case errors.Is(err, service.ErrFolderNotEmpty):
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "folder not empty"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *StorageHandler) UpdateFolder(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	folderID, err := uuid.Parse(c.Params("folder_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid folder_id",
		})
	}

	if len(c.Body()) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "missing request body",
		})
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(c.Body(), &raw); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid json"})
	}

	var newName *string
	if rawName, ok := raw["name"]; ok {
		var n string
		if err := json.Unmarshal(rawName, &n); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid name"})
		}
		newName = &n
	}

	var newParentID **uuid.UUID
	if rawParent, ok := raw["parent_id"]; ok {
		var ptr *uuid.UUID
		if err := json.Unmarshal(rawParent, &ptr); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid parent_id"})
		}
		newParentID = &ptr
	}
	if err := h.svc.UpdateFolder(userID, folderID, newName, newParentID); err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			case errors.Is(err, service.ErrCyclicMove):
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "cannot move folder into itself or one of its descendants"})
			case errors.Is(err, service.ErrInvalidParent):
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid parent"})
			case errors.Is(err, service.ErrInvalidName):
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid folder name"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}
	}
	return c.SendStatus(fiber.StatusOK)
}

func (h *StorageHandler) ListPersonalContents(c fiber.Ctx) error {

	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var parentID *uuid.UUID
	if raw := c.Query("parent_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid parent_id",
			})
		}
		parentID = &parsed
	}

	folders, files, err := h.svc.ListPersonalContents(userID, parentID)
	if err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}
	}

	var	folderItems	[]storage.FolderItem
	var	filesItems	[]storage.FilesItem

	folderItems = make([]storage.FolderItem, len(folders))
	for i, f := range folders {
		folderItems[i] = storage.FolderItem{ID: f.ID, Name: f.Name, CreatedAt: f.CreatedAt}
	}

	filesItems = make([]storage.FilesItem, len(files))
	for i, f := range files {
		filesItems[i] = storage.FilesItem{ID: f.ID, Name: f.Name, FileSize: f.FileSize, CreatedAt: f.CreatedAt}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"folders":	folderItems,
		"files":	filesItems,
	})
}

func (h *StorageHandler) ListFolderContents(c fiber.Ctx) error {
	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	folderID, err := uuid.Parse(c.Params("folder_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid folder_id",
		})
	}

	ptrFolderID := &folderID
	folders, files, err := h.svc.ListFolderContents(userID, ptrFolderID)
	if err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}
	}

	var folderItems	[]storage.FolderItem
	var filesItems	[]storage.FilesItem

	folderItems = make([]storage.FolderItem, len(folders))
	for i, f := range folders {
		folderItems[i] = storage.FolderItem{ID: f.ID, Name: f.Name, CreatedAt: f.CreatedAt}
	}

	filesItems = make([]storage.FilesItem, len(files))
	for i, f := range files {
		filesItems[i] = storage.FilesItem{ID: f.ID, Name: f.Name, FileSize: f.FileSize, CreatedAt: f.CreatedAt}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"folders":	folderItems,
		"files":	filesItems,
	})
}

func (h *StorageHandler) ListOrgContents(c fiber.Ctx) error {
	userID, err := h.extractUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	orgID, err := uuid.Parse(c.Params("org_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid org_id",
		})
	}

	folderID, err := uuid.Parse(c.Params("folder_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid folder_id",
		})
	}

	folders, files, err := h.svc.ListOrgContents(userID, orgID, folderID)
	if err != nil {
		switch {
			case errors.Is(err, service.ErrNotFound):
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			case errors.Is(err, service.ErrForbidden):
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
			default:
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
		}
	}

	var folderItems	[]storage.FolderItem
	var filesItems	[]storage.FilesItem

	folderItems = make([]storage.FolderItem, len(folders))
	for i, f := range folders {
		folderItems[i] = storage.FolderItem{ID: f.ID, Name: f.Name, CreatedAt: f.CreatedAt}
	}

	filesItems = make([]storage.FilesItem, len(files))
	for i, f := range files {
		filesItems[i] = storage.FilesItem{ID: f.ID, Name: f.Name, FileSize: f.FileSize, CreatedAt: f.CreatedAt}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"folders":	folderItems,
		"files":	filesItems,
	})
}
