package rbac

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrForbidden = errors.New("forbidden")
	ErrNotFound  = errors.New("not found")
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
	CanWrite(userID uuid.UUID, ownerUserID uuid.UUID, orgID *uuid.UUID) error

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
	OrgID		*uuid.UUID
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

func (c *DBChecker) CanWrite(userID uuid.UUID, ownerUserID uuid.UUID, orgID *uuid.UUID) error {

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
		Take(&role).Error

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

func (c *DBChecker) CanCreateInFolder(userID uuid.UUID, folderID *uuid.UUID, orgID *uuid.UUID) error {

	// personal space + root
	if folderID == nil && orgID == nil{
		return nil
	}

	// orga space + root
	if folderID == nil && orgID != nil {
		return c.checkOrgMembership(userID, *orgID)
	}

	// orga space + specific folder
	var folder folderRow
	err := c.db.Where("id = ?", *folderID).First(&folder).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}

	// same scope between folder and orga
	if !sameOrg(folder.OrgID, orgID) {
		return ErrForbidden
	}

	// personnal folder
	if folder.OrgID == nil {
		if folder.OwnerUserID != userID {
			return ErrForbidden
		}
		return nil
	}

	// Orga folder: any member can create
	return c.checkOrgMembership(userID, *folder.OrgID)
}


// private helpers
func (c *DBChecker) checkOrgMembership(userID, orgID uuid.UUID) error {
	var count int64
	err := c.db.Table("org_members").
		Where("org_id = ? AND user_id = ?", orgID, userID).
		Count(&count).Error

	if err != nil {
		return err
	}

	if count == 0 {
		return ErrForbidden
	}

	return nil
}

func sameOrg(firstOrga *uuid.UUID, secondOrga *uuid.UUID) bool {
	if firstOrga == nil && secondOrga == nil {
		return true
	}
	if firstOrga == nil || secondOrga == nil {
		return false
	}
	return *firstOrga == *secondOrga
}
