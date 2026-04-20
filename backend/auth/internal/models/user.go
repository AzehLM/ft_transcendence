package models

import (
	"github.com/google/uuid"

	"time"
)

type User struct {
	ID                  uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Email               string    `gorm:"size:255;uniqueIndex;not null" json:"email"`
	ClientSalt          []byte    `gorm:"type:bytea;not null" json:"clientSalt"`
	ServerSalt          []byte    `gorm:"type:bytea;not null" json:"serverSalt"`
	IV                  []byte    `gorm:"type:bytea;not null" json:"iv"`
	PublicKey           []byte    `gorm:"type:bytea;not null" json:"publicKey"`
	EncryptedPrivateKey []byte    `gorm:"type:bytea;not null" json:"encryptedPrivateKey"`
	AuthHash            string    `gorm:"size:255;not null" json:"-"` // Exclude from JSON responses
	UsedSpace           int64     `gorm:"not null;default:0" json:"usedSpace"`
	MaxSpace            int64     `gorm:"not null;default:5368709120" json:"maxSpace"`
	RefreshToken        *string   `gorm:"type:varchar(255);uniqueIndex" json:"refreshToken,omitempty"`
	CreatedAt           time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt           time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"updatedAt"`
	AvatarURL *string `gorm:"type:varchar(255)" json:"avatarUrl,omitempty"`
	
	// Username  *string `gorm:"type:varchar(50);uniqueIndex" json:"username,omitempty"`
	

	// TwoFactorSecret    *string `gorm:"type:varchar(255)" json:"-"`
	// IsTwoFactorEnabled bool    `gorm:"default:false" json:"isTwoFactorEnabled"`
}
