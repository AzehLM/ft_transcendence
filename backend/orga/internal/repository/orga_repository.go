package repository

import (
	"backend/orga/internal/models"
	"gorm.io/gorm"
    "github.com/google/uuid"
)

func GetAllOrgas(db *gorm.DB) ([]models.Orga, error) {
    var Orgas []models.Orga
    result := db.Find(&Orgas)
    return Orgas, result.Error
}


func GetMemberOrga(db *gorm.DB, userID uuid.UUID) ([]models.Orga, error) {
    var Orgas []models.Orga
    result := db.
        Distinct().
        Joins("JOIN org_members ON org_members.org_id = organizations.id").
        Where("org_members.user_id IN (?)", userID).
        Find(&Orgas)

    return Orgas, result.Error
}