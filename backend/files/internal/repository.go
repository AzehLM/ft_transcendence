package files

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// contract -> ce que chaque repo de fichier doit savoir faire
type FileRepository interface {
    ActivateFile(objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error // POST /files/finalize
	// DeleteFile(fileID uuid.UUID) error								// DELETE /files/{file_id}
	FindByObjectID(objectID uuid.UUID) (*File, error)				// POST /files/finalize
	InsertPendingFile(file *File) error								// POST /files/upload-url
    // FindByID(fileID uuid.UUID) (*File, error)						// GET /downlowd and DELETE
    // UpdateFileFolder(fileID uuid.UUID, folderID *uuid.UUID) error	// PATCH /files/{file_id}

	// ref: https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/api_routes.md#files
}



// ⚠️​ no Majuscule veut dire private, propre au package
type fileRepository struct {
	db *gorm.DB
}

// Creates a new implementation of FileRepository (interface) with initialized db
// Whoever uses the returned FileRepository ony sees the contract, not the implementation (gorm, private structure)
// This basicaly is a factory of repository (ref: https://refactoring.guru/fr/design-patterns/factory-method/go/example)
// I can return a fileRepository and not a FileRepository because fileRepository is a FileRepository (let's say it like that, just like the inheritance in cpp)
func NewFileRepository(db *gorm.DB) FileRepository {
    return &fileRepository{db: db}
}

// comprendre ce que c'est une interface Go (contract)
// https://research.swtch.com/interfaces


// pointeur vers File et pas référence pour que GORM puisse le modifier directement en mémoire (remplir les champs)
// pas d'exceptions en go alors .Error extrait l'erreur si il y a (nil si tout va bien)
// this function creates a file, we do that when a user asks for a presigned URL to reserve created object ID
func (r *fileRepository) InsertPendingFile(file *File) error {
	return r.db.Create(file).Error
}

// Looks for the First element that has this ID as we should never have 2 same minio_object_key
func (r *fileRepository) FindByObjectID (objectID uuid.UUID) (*File, error) {
	var file File
	err := r.db.Where("minio_object_key = ? AND status = ?", objectID, "PENDING").First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}


// to check, zero-value are ignored by GORM in a struct
// Which means I'll have to test for name = "", iv = nil, encryptedDEK empty etc...
func (r *fileRepository) ActivateFile(objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) error {
	err := r.db.Model(&File{}).
		Where("minio_object_key = ?", objectID).
		Updates(File{
			Name: name,
			EncryptedDEK: encryptedDEK,
			IV: iv,
			Status: "ACTIVE",
			OrgID: orgID,
		}).Error
	return err
}
