package files

import (
	"time"
	"github.com/google/uuid"
)

type File struct {
    ID             uuid.UUID  `gorm:"type:uuid;primaryKey"`
    OwnerUserID    uuid.UUID  `gorm:"type:uuid;not null"`
    OrgID          *uuid.UUID `gorm:"type:uuid"`
    FolderID       *uuid.UUID `gorm:"type:uuid"`
    Name           string     `gorm:"type:varchar(100);not null"`
    FileSize       int64      `gorm:"not null"`
    MinioObjectKey uuid.UUID  `gorm:"type:uuid;uniqueIndex;not null"`
    EncryptedDEK   []byte     `gorm:"type:bytea;not null"`
    IV             []byte     `gorm:"type:bytea;not null"`
    Status         string     `gorm:"type:varchar(20);not null;default:'PENDING'"`
    CreatedAt      time.Time
}

// unnecessary as GORM looks for a table as its plural in snake_case of the struct.
// struct File is identified by GORM as files
// File -> files
// but for homogeneity, to match what you've done I'm adding it just in case

func (File) TableName() string {
    return "files"
}
