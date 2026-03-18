package repository

import (
	"orga/backend/orga/internal/models"
	"gorm.io/gorm"
)

func GetAllOrgas(db *gorm.DB) ([]models.Orga, error) {
    var Orgas []models.Orga
    result := db.Find(&Orgas)
    return Orgas, result.Error
}