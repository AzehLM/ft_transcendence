package models

import (
	"github.com/google/uuid"

	"time"
)

type User struct {
	ID                  uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email               string    `gorm:"size:255;uniqueIndex;not null"`
	ClientSalt          []byte    `gorm:"type:bytea;not null"`
	ServerSalt          []byte    `gorm:"type:bytea;not null"`
	IV                  []byte    `gorm:"type:bytea;not null"`
	PublicKey           []byte    `gorm:"type:bytea;not null"`
	EncryptedPrivateKey []byte    `gorm:"type:bytea;not null"`
	AuthHash            string    `gorm:"size:255;not null"`
	UsedSpace           int64     `gorm:"not null;default:0"`
	MaxSpace            int64     `gorm:"not null;default:5368709120"`
	RefreshToken *string `gorm:"type:varchar(255);uniqueIndex"`
	CreatedAt time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP"`

	// Username  *string `gorm:"type:varchar(50);uniqueIndex"`
	// AvatarURL *string `gorm:"type:varchar(255)"`

	// TwoFactorSecret    *string `gorm:"type:varchar(255)"`
	// IsTwoFactorEnabled bool    `gorm:"default:false"`
}
