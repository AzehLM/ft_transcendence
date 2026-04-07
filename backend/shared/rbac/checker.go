package rbac

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// not passing *File so this interface is a stand-alone and has no dependencies to the storage package
// I'll extract the data needed from file calling the checker
type Checker interface {

	// read: metadata + download
	// personal space: owner only
	// orga: anyone (admin, member)
	CanReadFile(userID uuid.UUID, ownerUserID uuid.UUID, orgID *uuid.UUID) error

	// write: delete + move
	// personal space: owner only
	// orga: admin or owner
	CanWriteFile(userID uuid.UUID, ownerUserID uuid.UUID, orgID *uuid.UUID) error

	// context: upload
	// personal space: owner only (folderID needs to be owned by user as well if not nil)
	// orga: anyone (folderID needs to be owned by the orga if not nil)
	CanCreateInFolder(userID uuid.UUID, folderID *uuid.UUID, orgID *uuid.UUID) error
}

type DBChecker struct {
	db *gorm.DB
}

func NewDBChecker(db *gorm.DB) Checker {
	return &DBChecker{db: db}
}

type folderRow struct {
	ID			uuid.UUID
	OwnerUserID	uuid.UUID
	folderID	*uuid.UUID
	orgID		*uuid.UUID
}

func (folderRow) TableName() string { return "folders" }
