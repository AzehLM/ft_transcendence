package storage

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)
var (
	ErrNotFound = fmt.Errorf("not found")
	ErrEmpty = fmt.Errorf("cannot be empty")
)

// db contract -> these methods represents what each file/folder repository have to be able to do
type StorageRepository interface {
	// File part
	DeleteFile(fileID uuid.UUID) error											// DELETE /files/{file_id}
	FindByObjectID(objectID uuid.UUID) (*File, error)							// POST /files/finalize
	InsertPendingFile(file *File) error											// POST /files/upload-url
	ActivateFile(objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID, ownerID uuid.UUID) error // POST /files/finalize
	FindByID(fileID uuid.UUID) (*File, error)									// GET /download and DELETE
	UpdateFileFolder(fileID uuid.UUID, folderID *uuid.UUID) (int64, error)		// PATCH /files/{file_id}
	// ref: https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/api_routes.md#files

	FindFilesByUserID(userID uuid.UUID) ([]File, error)	// used for user_deleted event handling
	FindFilesByOrgID(orgID uuid.UUID) ([]File, error)	// used for org_deleted event handling
	DeleteOrgData(orgID uuid.UUID) error
	DeleteUserData(userID uuid.UUID) error

	// Folder part
	CreateFolder(folder *Folder) error											// POST /folders
	FindFolderByID(folderID uuid.UUID) (*Folder, error)							// GET /folders?parent_id=xxx and GET /orgs/{org_id}/folders/{folder_id}/contents
	IsFolderEmpty(folderID uuid.UUID) (bool, error)								// DELETE /folders/{folder_id}
	DeleteFolder(folderID uuid.UUID) error										// DELETE /folders/{folder_id}
	UpdateFolder(folderID uuid.UUID, updates map[string]interface{}) error		// PATCH /folders/{folder_id}
	IsDescendant(folderID uuid.UUID, parent uuid.UUID) (bool, error)

	ListFolderContents(ownerID uuid.UUID, parentID *uuid.UUID) ([]Folder, []File, error)	// GET /folders?parent_id=xxx
	ListOrgFolderContents(orgID uuid.UUID, folderID uuid.UUID) ([]Folder, []File, error)	// GET /orgs/{org_id}/folders/{folder_id}/contents

	// Space utils
	GetUserSpace(userID uuid.UUID) (usedSpace int64, maxSpace int64, err error)
	TryIncrementUserUsedSpace(userID uuid.UUID, delta int64) (bool, error)
	DecrementUserUsedSpace(userID uuid.UUID, delta int64) error
}

type storageRepository struct {
	db *gorm.DB
}

// NewStorageRepository creates a new implementation of StorageRepository (interface) with initialized db
// Whoever uses the returned StorageRepository only sees the contract, not the implementation (gorm, private structure)
// This basicaly is a factory of repository (ref: https://refactoring.guru/fr/design-patterns/factory-method/go/example)
func NewStorageRepository(db *gorm.DB) StorageRepository {
	return &storageRepository{db: db}
}

// InsertPendingFile has a pointer to File and not a reference so GORM can change it in memory (fill the fields)
// No exceptions in go so we return .Error and the calling method will extract its value (nil if all good)
// this function creates a file, we do that when a user asks for a presigned URL to reserve created object ID
func (r *storageRepository) InsertPendingFile(file *File) error {
	return r.db.Create(file).Error
}

// FindByObjectID looks for the First element that has this ID as we should never have 2 same minio_object_key
func (r *storageRepository) FindByObjectID(objectID uuid.UUID) (*File, error) {
	var file File
	err := r.db.Where("minio_object_key = ? AND status = ?", objectID, "PENDING").First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

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

// FindByID only returns ACTIVE files!
func (r *storageRepository) FindByID(fileID uuid.UUID) (*File, error) {
	var file File
	err := r.db.Where("id = ? AND status = ?", fileID, "ACTIVE").First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// DeleteFile needs to be called before removing a real MinIO object
func (r *storageRepository) DeleteFile(fileID uuid.UUID) error {
	return r.db.Delete(&File{}, fileID).Error
}

// updates a file folder, folderID is a pointer because it can be nil (case where the file is not in a folder, its at the root of the user storage space)
func (r *storageRepository) UpdateFileFolder(fileID uuid.UUID, folderID *uuid.UUID) (int64, error) {
	result := r.db.Model(&File{}).
		Where("id = ?", fileID).
		Update("folder_id", folderID)

	return result.RowsAffected, result.Error
}

// GetUserSpace
// Space utils
// The following methods depends on the `users` table and more specificaly on the:
// - id			UUID
// - used_space	BIGINT
// - max_space	BIGINT
// that are own by the auth service.
// These read/write directly via db.Table("users") to avoid coupling the storage service to the auth's User struct (no duplication).
// For maintainability, any update on the User struct requires cross-service coordination
func (r *storageRepository) GetUserSpace(userID uuid.UUID) (usedSpace int64, maxSpace int64, err error) {
	var result struct {
		UsedSpace int64
		MaxSpace  int64
	}

	err = r.db.Table("users").
		Select("used_space, max_space").
		Where("id = ?", userID).
		Take(&result).Error
	if err != nil {
		return 0, 0, err
	}

	return result.UsedSpace, result.MaxSpace, nil
}

// TryIncrementUserUsedSpace "Try" because this version is an atomic check-and-set (a single query SQL).
// Postgres evaluates used_space + ? <= max_space and UPDATE it in the same transaction to avoid TOCTOU issues (Time-of-check to time-of-use)
func (r *storageRepository) TryIncrementUserUsedSpace(userID uuid.UUID, delta int64) (bool, error) {
	result := r.db.Table("users").
		Where("id = ? AND used_space + ? <= max_space", userID, delta).
		UpdateColumn("used_space", gorm.Expr("used_space + ?", delta))
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected == 1, nil
}

func (r *storageRepository) DecrementUserUsedSpace(userID uuid.UUID, delta int64) error {
	return r.db.Table("users").
		Where("id = ?", userID).
		UpdateColumn("used_space", gorm.Expr("used_space - ?", delta)).Error
}



// Folders

func (r *storageRepository) CreateFolder(folder *Folder) error {
	return r.db.Create(folder).Error
}

func (r *storageRepository) FindFolderByID(folderID uuid.UUID) (*Folder, error) {
	var folder Folder
	if err := r.db.First(&folder, "id = ?", folderID).Error; err != nil {
		return nil, err
	}
	return &folder, nil
}

// IsFolderEmpty doesn't check if the folderID exists, a call to FindFolderByID needs to be done prior to IsFolderEmpty
func (r *storageRepository) IsFolderEmpty(folderID uuid.UUID) (bool, error) {
	var folderCount int64
	if err := r.db.Model(&Folder{}).Where("parent_id = ?", folderID).Limit(1).Count(&folderCount).Error; err != nil {
		return false, err
	}

	if folderCount > 0 {
		return false, nil
	}

	var fileCount int64
	if err := r.db.Model(&File{}).Where("folder_id = ?", folderID).Limit(1).Count(&fileCount).Error; err != nil {
		return false, err
	}

	if fileCount > 0 {
		return false, nil
	}

	return true, nil
}

// DeleteFolder doesn't check if folderID exists as well, FindFolderByID and IsFolderEmpty needs to be called prior to this
func (r *storageRepository) DeleteFolder(folderID uuid.UUID) error {
	return r.db.Delete(&Folder{}, "id = ?", folderID).Error
}

// UpdateFolder, same here, doesn't check if folderID exists
// updates is filled by the handler and may contain the folder name and/or parent_id.
func (r *storageRepository) UpdateFolder(folderID uuid.UUID, updates map[string]interface{}) error {
	result := r.db.Model(&Folder{}).Where("id = ?", folderID).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// IsDescendant uses CTE SQL recursive to ascend into ancestor folders in one request
func (r *storageRepository) IsDescendant(folderID uuid.UUID, ancestorID uuid.UUID) (bool, error) {

	// recursive CTE (common table expression): starting from folderID and going up in the folder tree until parent_id == nil
	// if we find the parent uuid then we're done as we're looking for the first ancestor on the way up
	// french doc if I ever need to go back and modify it (TODO: delete links)
	// https://learnsql.fr/blog/qu-est-ce-qu-un-cte-recursif-en-sql/
	// https://learnsql.fr/blog/qu-est-ce-qu-une-cte/

	var isDesc bool
	// there is no gorm extensible api to execute recursive CTE so I'll have to leave it like that until I can test it
	// this create an ancestors temporary table used for the recursive.
	// f is a shorcut for folder, a for ancestors


	// things to test:
	// root folder to different root folder -> false
	// folder to its own id -> true
	// child folder to direct parent -? true
	// deep child folder to high ancestor (several folders aboves) -> true
	err := r.db.Raw(`
		WITH RECURSIVE ancestors AS (
			SELECT id, parent_id FROM folders WHERE id = ?
			UNION
			SELECT f.id, f.parent_id FROM folders f
			INNER JOIN ancestors a ON f.id = a.parent_id
		)
		SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = ?)
	`, folderID, ancestorID).Scan(&isDesc).Error

	if err != nil {
		return false, err
	}

	return isDesc, nil
}

func (r *storageRepository) ListFolderContents(ownerID uuid.UUID, parentID *uuid.UUID) ([]Folder, []File, error) {
	// 2 queries to fill folders then files
	var folders	[]Folder
	var files	[]File

	folderQuery := r.db.Where("owner_user_id = ?", ownerID)
	if parentID == nil {
		folderQuery = folderQuery.Where("parent_id IS NULL")
	} else {
		folderQuery = folderQuery.Where("parent_id = ?", *parentID)
	}
	// filling folders
	if err := folderQuery.Find(&folders).Error; err != nil {
		return nil, nil, err
	}

	// ACTIVE files only
	fileQuery := r.db.Where("owner_user_id = ? AND status = ?", ownerID, "ACTIVE")
	if parentID == nil {
		fileQuery = fileQuery.Where("folder_id IS NULL")
	} else {
		fileQuery = fileQuery.Where("folder_id = ?", *parentID)
	}
	// filling files
	if err := fileQuery.Find(&files).Error; err != nil {
		return nil, nil, err
	}

	return folders, files, nil
}

func (r *storageRepository) ListOrgFolderContents(orgID uuid.UUID, folderID uuid.UUID) ([]Folder, []File, error) {
	var folders	[]Folder
	var files	[]File

	folderQuery := r.db.Where("org_id = ? AND parent_id = ?", orgID, folderID)

	if err := folderQuery.Find(&folders).Error; err != nil {
		return nil, nil, err
	}

	fileQuery := r.db.Where("org_id = ? AND folder_id = ? AND status = ?", orgID, folderID, "ACTIVE")

	if err := fileQuery.Find(&files).Error; err != nil {
		return nil, nil, err
	}

	return folders, files, nil
}

func (r *storageRepository) FindFilesByOrgID(orgID uuid.UUID) ([]File, error) {
	var files []File
	err := r.db.Where("org_id = ? AND status = 'ACTIVE'", orgID).Find(&files).Error
	if err != nil {
		return nil, err
	}
	return files, nil
}

func (r *storageRepository) FindFilesByUserID(userID uuid.UUID) ([]File, error) {
	var files []File
	err := r.db.Where("owner_user_id = ? AND status = 'ACTIVE'", userID).Find(&files).Error
	if err != nil {
		return nil, err
	}
	return files, nil
}

func (r *storageRepository) DeleteOrgData(orgID uuid.UUID) error {
	// files first because it can have FK to folders
	if err := r.db.Where("org_id = ?", orgID).Delete(&File{}).Error; err != nil {
		return err
	}
	if err := r.db.Where("org_id = ?", orgID).Delete(&Folder{}).Error; err != nil {
		return err
	}
	return nil
}

func (r *storageRepository) DeleteUserData(userID uuid.UUID) error {
	if err := r.db.Where("user_id = ?", userID).Delete(&File{}).Error; err != nil {
		return err
	}
	if err := r.db.Where("user_id = ?", userID).Delete(&Folder{}).Error; err != nil {
		return err
	}
	return nil
}
