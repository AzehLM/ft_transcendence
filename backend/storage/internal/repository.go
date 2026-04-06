package storage

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrNotFound = fmt.Errorf("not found")
var ErrEmpty = fmt.Errorf("cannot be empty")

// contract -> ce que chaque repo de fichier doit savoir faire
type StorageRepository interface {
	// File part
	DeleteFile(fileID uuid.UUID) error                                                                    // DELETE /files/{file_id}
	FindByObjectID(objectID uuid.UUID) (*File, error)                                                     // POST /files/finalize
	InsertPendingFile(file *File) error                                                                   // POST /files/upload-url
	ActivateFile(objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID, ownerID uuid.UUID) error // POST /files/finalize
	FindByID(fileID uuid.UUID) (*File, error)                                                             // GET /download and DELETE
	UpdateFileFolder(fileID uuid.UUID, folderID *uuid.UUID) error                                         // PATCH /files/{file_id}
	UpdateFileName(fileID uuid.UUID, name string) error													  // pas encore decidé, a voir avec la methode de dessus...
	// ref: https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/api_routes.md#files

	// Folder part
	CreateFolder(folder *Folder) error
}

// ⚠️​ no Majuscule veut dire private, propre au package
type storageRepository struct {
	db *gorm.DB
}

// Creates a new implementation of StorageRepository (interface) with initialized db
// Whoever uses the returned StorageRepository ony sees the contract, not the implementation (gorm, private structure)
// This basicaly is a factory of repository (ref: https://refactoring.guru/fr/design-patterns/factory-method/go/example)
// I can return a storageRepository and not a StorageRepository because storageRepository is a StorageRepository (let's say it like that, just like the inheritance in cpp)
func NewStorageRepository(db *gorm.DB) StorageRepository {
	return &storageRepository{db: db}
}

// comprendre ce que c'est une interface Go (contract)
// https://research.swtch.com/interfaces

// pointeur vers File et pas référence pour que GORM puisse le modifier directement en mémoire (remplir les champs)
// pas d'exceptions en go alors .Error extrait l'erreur si il y a (nil si tout va bien)
// this function creates a file, we do that when a user asks for a presigned URL to reserve created object ID
func (r *storageRepository) InsertPendingFile(file *File) error {
	return r.db.Create(file).Error
}

// Looks for the First element that has this ID as we should never have 2 same minio_object_key
func (r *storageRepository) FindByObjectID(objectID uuid.UUID) (*File, error) {
	var file File
	err := r.db.Where("minio_object_key = ? AND status = ?", objectID, "PENDING").First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// Each map key represent a SQL column name
func (r *storageRepository) ActivateFile(objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID, ownerID uuid.UUID) error {
	result := r.db.Model(&File{}).
		Where("minio_object_key = ? AND status = ? AND owner_user_id = ?", objectID, "PENDING", ownerID).
		Updates(map[string]interface{}{
			"name":          name,
			"encrypted_dek": encryptedDEK,
			"iv":            iv,
			"status":        "ACTIVE",
			"org_id":        orgID,
		})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *storageRepository) FindByID(fileID uuid.UUID) (*File, error) {
	var file File
	err := r.db.First(&file, fileID).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// needs to be called before removing a real MinIO object
func (r *storageRepository) DeleteFile(fileID uuid.UUID) error {
	return r.db.Delete(&File{}, fileID).Error
}

// updates a file folder, folderID is a pointer because it can be nil (case where the file is not in a folder, its at the root of the user storage space)
func (r *storageRepository) UpdateFileFolder(fileID uuid.UUID, folderID *uuid.UUID) error {
	result := r.db.Model(&File{}).
		Where("id = ?", fileID).
		Update("folder_id", folderID)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *storageRepository) UpdateFileName(fileID uuid.UUID, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return ErrEmpty
	}

	result := r.db.Model(&File{}).
		Where("id = ?", fileID).
		Update("name", name)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *storageRepository) CreateFolder(folder *Folder) error {
	return r.db.Create(folder).Error
}
