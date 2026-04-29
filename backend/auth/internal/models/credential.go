package models

import (
    "github.com/google/uuid"
    "time"
)

type Credential struct {
    ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
    UserID       uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"`
    CredentialID []byte    `gorm:"type:bytea;not null" json:"credentialId"`
    PublicKey    []byte    `gorm:"type:bytea;not null" json:"publicKey"`
    DeviceName   string    `gorm:"size:100;not null" json:"deviceName"`
    LastUsedAt   time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"lastUsedAt"`
    CreatedAt    time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
}