package repository

import (
	"backend/orga/internal/models"
	"gorm.io/gorm"
    "github.com/google/uuid"
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


func (r *OrganizationRepository) GetMemberOrga(userID uuid.UUID) ([]models.Orga, error) {
    var orgas []models.Orga
    result := r.DB.
        Distinct().
        Joins("JOIN org_members ON org_members.org_id = organizations.id").
        Where("org_members.user_id IN (?)", userID).
        Find(&orgas)

    return orgas, result.Error
}

func (r *OrganizationRepository) CreateNewOrga(orga *models.Orga) error {
    return r.DB.Create(orga).Error
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
    return r.DB.Where("email = ?", email).Take(&user).Error
}

func (r *OrganizationRepository) GetOrgaMember(orgID uuid.UUID, userID uuid.UUID, orgaMember *models.OrgaMember) error {
    return r.DB.Where("user_id = ? AND org_id = ?", userID, orgID).Take(&orgaMember).Error
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
    result := r.DB.Where("user_id = ? AND org_id = ?", userID, orgID).Delete(&models.OrgaMember{})
    if result.Error != nil {
        return false, result.Error
    }
    return result.RowsAffected > 0, nil
}

func (r *OrganizationRepository) GetAllMembersFromOrga(orgID uuid.UUID) ([]models.OrgaMemberResponse, error) {
    var members []models.OrgaMemberResponse
    result := r.DB.Model(&models.OrgaMember{}).
		Select("org_members.user_id, org_members.role, users.email").
		Joins("JOIN users ON users.id = org_members.user_id").
		Where("org_members.org_id = ?", orgID).
		Scan(&members)

    return members, result.Error
}