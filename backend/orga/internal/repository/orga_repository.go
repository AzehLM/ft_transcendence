package repository

import (
	"backend/orga/internal/models"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrganizationRepository struct {
    DB *gorm.DB
}

func NewOrganizationRepository(db *gorm.DB) *OrganizationRepository {
    return &OrganizationRepository{DB: db}
}

func (r *OrganizationRepository) GetAllOrgas() ([]models.Orga, error) {
    var orgas []models.Orga
    result := r.DB.Find(&orgas)
    return orgas, result.Error
}


// func (r *OrganizationRepository) GetMemberOrga(userID uuid.UUID) ([]models.Orga, error) {
//     var orgas []models.Orga
//     result := r.DB.
//         Distinct().
//         Joins("JOIN org_members ON org_members.org_id = organizations.id").
//         Where("org_members.user_id IN (?)", userID).
//         Find(&orgas)

//     return orgas, result.Error
// }

func (r *OrganizationRepository) GetMemberOrga(userID uuid.UUID) ([]models.OrgResponse, error) {
    var orgResponses []models.OrgResponse
    result := r.DB.Table("organizations").
        Select("organizations.id, organizations.name, organizations.public_key, organizations.used_space, organizations.max_space, organizations.created_at, org_members.role, org_members.description").
        Joins("JOIN org_members ON org_members.org_id = organizations.id").
        Where("org_members.user_id = ?", userID).
        Scan(&orgResponses)
    if result.Error != nil {
        return nil, result.Error
    }
    if orgResponses == nil {
        orgResponses = []models.OrgResponse{}
    }
    return orgResponses, nil
}

// func (r *OrganizationRepository) CreateNewOrga(orga *models.Orga) error {
//     return r.DB.Create(orga).Error
// }

func (r *OrganizationRepository) CreateOrgWithAdmin(org *models.Orga, adminMember *models.OrgaMember) error {
    return r.DB.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(org).Error; err != nil {
            return err
        }
        adminMember.OrgID = org.ID
        if err := tx.Create(adminMember).Error; err != nil {
            return err
        }
        return nil
    })
}

func (r *OrganizationRepository) CreateNewOrgaMember(orgaMember *models.OrgaMember) error {
    return r.DB.Create(orgaMember).Error
}

func (r *OrganizationRepository) DeleteOrganization(orgID uuid.UUID) (bool, error) {
    result := r.DB.Where("id = ?", orgID).Delete(&models.Orga{})
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r *OrganizationRepository) UpdateOrgaName(orgID uuid.UUID, name string) (bool, error) {
    result := r.DB.Model(&models.Orga{}).Where("id = ?", orgID).Update("name", name)
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r *OrganizationRepository) GetUserByEmail(email string, user *models.User) error {
    return r.DB.Where("email = ?", email).Take(user).Error
}

func (r *OrganizationRepository) GetOrgaMember(orgID uuid.UUID, userID uuid.UUID, orgaMember *models.OrgaMember) error {
    return r.DB.Where("user_id = ? AND org_id = ?", userID, orgID).Take(orgaMember).Error
}

func (r *OrganizationRepository) UpdateMemberRole(orgID uuid.UUID, userID uuid.UUID, role string) (bool, error) {
    result := r.DB.Model(&models.OrgaMember{}).Where("user_id = ? AND org_id = ?",userID,  orgID).Update("role", role)
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r *OrganizationRepository) CountAdmin(orgID uuid.UUID) int64 {
    var count int64
    r.DB.Model(&models.OrgaMember{}).
            Where("org_id = ? AND role = ?", orgID, "admin").
            Count(&count)
    return count
}

func (r *OrganizationRepository) DeleteOrgaMember(orgID uuid.UUID, userID uuid.UUID) (bool, error) {
	var deleted bool
	err := r.DB.Transaction(func(tx *gorm.DB) error {
		var oldestAdmin struct {
			UserID uuid.UUID `gorm:"column:user_id"`
		}
		errQuery := tx.Table("org_members").
			Where("org_id = ? AND role = ? AND user_id != ?", orgID, "admin", userID).
			Order("joined_at ASC").
			Select("user_id").
			Limit(1).
			Take(&oldestAdmin).Error

		if errQuery == nil {
			if err := tx.Table("files").
				Where("owner_user_id = ? AND org_id = ?", userID, orgID).
				Update("owner_user_id", oldestAdmin.UserID).Error; err != nil {
				return err
			}
			if err := tx.Table("folders").
				Where("owner_user_id = ? AND org_id = ?", userID, orgID).
				Update("owner_user_id", oldestAdmin.UserID).Error; err != nil {
				return err
			}
		} else if !errors.Is(errQuery, gorm.ErrRecordNotFound) {
			return errQuery
		}

		result := tx.Where("user_id = ? AND org_id = ?", userID, orgID).Delete(&models.OrgaMember{})
		if result.Error != nil {
			return result.Error
		}
		deleted = result.RowsAffected > 0
		return nil
	})

	if err != nil {
		return false, err
	}
	return deleted, nil
}

func (r *OrganizationRepository) GetAllMembersFromOrga(orgID uuid.UUID) ([]models.OrgaMemberResponse, error) {
    var members []models.OrgaMemberResponse
    result := r.DB.Model(&models.OrgaMember{}).
		Select("org_members.user_id, org_members.role, users.email, users.family_name, users.first_name").
		Joins("JOIN users ON users.id = org_members.user_id").
		Where("org_members.org_id = ?", orgID).
		Scan(&members)

    return members, result.Error
}

func (r* OrganizationRepository) GetOrgaByID(orgID uuid.UUID) (models.Orga, error) {
    var org models.Orga
    err := r.DB.First(&org, orgID).Error
    return org, err
}

func (r* OrganizationRepository) UpdateMaxSpace(space int64, orgID uuid.UUID) (bool, error) {
    result := r.DB.Model(&models.Orga{}).Where("id = ?", orgID).Update("max_space", space)
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r* OrganizationRepository) UpdateUsedSpace(space int64, orgID uuid.UUID) (bool, error) {
    result := r.DB.Model(&models.Orga{}).Where("id = ?", orgID).Update("used_space", space)
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r* OrganizationRepository) GetMemberRole(orgID uuid.UUID, userID uuid.UUID) (string, error) {
    var member models.OrgaMember
    result := r.DB.Where("org_id = ? AND user_id = ?", orgID, userID).First(&member)
    if result.Error != nil {
        return "", result.Error
    }
    return member.Role, nil
}

func (r* OrganizationRepository) GetDescription(orgID uuid.UUID, userID uuid.UUID) (string, error) {
    var member models.OrgaMember
    result := r.DB.Where("org_id = ? AND user_id = ?", orgID, userID).First(&member)
    if result.Error != nil {
        return "", result.Error
    }
    return member.Description, nil
}

func (r *OrganizationRepository) UpdateDescription(orgID uuid.UUID, userID uuid.UUID, description string) (bool, error) {
    result := r.DB.Model(&models.OrgaMember{}).Where("org_id = ? AND user_id = ?", orgID, userID).Update("description", description)
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r *OrganizationRepository) GetUserByID(userID uuid.UUID, user *models.User) error {
    return r.DB.Where("id = ?", userID).Take(user).Error
}