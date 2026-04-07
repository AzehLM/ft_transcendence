package rbac

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrForbidden = errors.New("forbidden")

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

func (c *DBChecker) CanReadFile(userID uuid.UUID, ownerUserID uuid.UUID, orgID *uuid.UUID) error {

	if orgID == nil {
		if userID != ownerUserID {
			return ErrForbidden
		}
		return nil
	}

	var count int64 // maybe its too much lol ?
	err := c.db.Table("org_members"). // not checking role here since it doesn't matter, everyone have the same rights
		Where("org_id = ? AND user_id = ?", *orgID, userID).
		Count(&count).Error // count instead of First

	if err != nil {
		return err
	}

	// 0 means the user is not in the organization
	if count == 0 {
		return ErrForbidden
	}

	return nil
}

func (c *DBChecker) CanWriteFile(userID uuid.UUID, ownerUserID uuid.UUID, orgID *uuid.UUID) error {

	if orgID == nil {
		if userID != ownerUserID {
			return ErrForbidden
		}
		return nil
	}

	// using a struct so I can use gorm.ErrRecordNotFound (in the err check below the query) and not import a sql package since gorm doesn't have ErrNoRows in its errors
	type memberRole struct {
		Role string
	}

	var role memberRole
	err := c.db.Table("org_members").
		Select("role").
		Where("org_id = ? AND user_id = ?", *orgID, userID).
		Row().Scan(&role)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrForbidden
		}
		return err
	}

	if role.Role == "admin" {
		return nil
	}

	// if we get there then the check on role="member" is not necessary
	if userID == ownerUserID {
		return nil
	}

	return ErrForbidden
}
