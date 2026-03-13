package models

import (
    "time"

    "github.com/google/uuid"
)

type File struct {
    ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    OwnerUserID    uuid.UUID  `gorm:"type:uuid;not null;index"`
    OrgID          *uuid.UUID `gorm:"type:uuid;default:null"`
    FolderID       *uuid.UUID `gorm:"type:uuid;default:null"`
    Name           string     `gorm:"type:varchar(100);not null"`
    FileSize       int64      `gorm:"not null"`
    MinioObjectKey uuid.UUID  `gorm:"type:uuid;unique;not null"`

    EncryptedDek   []byte     `gorm:"type:bytea;not null"`
    Iv             []byte     `gorm:"type:bytea;not null"`

    CreatedAt      time.Time  `gorm:"autoCreateTime"`

    Owner          User       `gorm:"foreignKey:OwnerUserID;constraint:OnDelete:CASCADE;"`
}
