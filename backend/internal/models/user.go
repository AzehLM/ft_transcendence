// Path: backend/internal/models/user.go
package models

import (
    "time"

    "github.com/google/uuid"
)

type User struct {
    ID                  uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    Email               string    `gorm:"type:varchar(255);uniqueIndex;not null"`

    Salt1               []byte    `gorm:"type:bytea;not null"`
    PublicKey           []byte    `gorm:"type:bytea;not null"`
    EncryptedPrivateKey []byte    `gorm:"type:bytea;not null"`

    AuthHash            string    `gorm:"type:varchar(255);not null"`
    UsedSpace           int64     `gorm:"not null;default:0"`
    MaxSpace            int64     `gorm:"not null;default:5368709120"`

    CreatedAt           time.Time `gorm:"autoCreateTime"`
    UpdatedAt           time.Time `gorm:"autoUpdateTime"`
}

func (u *User) WipeSecrets() {
    for i := range u.Salt1 {
        u.Salt1[i] = 0
    }
    for i := range u.EncryptedPrivateKey {
        u.EncryptedPrivateKey[i] = 0
    }
}
