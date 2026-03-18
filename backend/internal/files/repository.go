package files

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// contract -> ce que chaque repo de fichier doit savoir faire
type FileRepository interface {
	InsertPendingFile(file *File) error
	FindByID(fileID uuid.UUID) (*File, error)
	// ...
	DeleteFile(fileID uuid.UUID) error
}

// ⚠️​ no Majuscule veut dire private, propre au package
type fileRepository struct {
	db *gorm.DB
}


// comprendre ce que c'est une interface Go (contract)


// r = this-> du CPP
// pointeur vers File et pas référence pour que GORM puisse le modifier directement en mémoire (remplir les champs)
// pas d'exceptions en go alors .Error extrait l'erreur si il y a (nil si tout va bien)
func (r *fileRepository) InsertPendingFile(file *File) error {
	return r.db.Create(file).Error
}
