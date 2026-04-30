package models

import (
	"time"
	"github.com/google/uuid"
)

type Orga struct {
	ID			uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name		string `gorm:"size:100;not null" json:"name"`
	PublicKey	[]byte `gorm:"type:bytea;not null" json:"public_key"`
	UsedSpace	int64     `gorm:"not null;default:0" json:"used_space"`
	MaxSpace	int64     `gorm:"not null;default:5368709120" json:"max_space"`
	CreatedAt	time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

type OrgResponse struct {
	ID			uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name		string `gorm:"size:100;not null" json:"name"`
	PublicKey	[]byte `gorm:"type:bytea;not null" json:"public_key"`
	UsedSpace	int64     `gorm:"not null;default:0" json:"used_space"`
	MaxSpace	int64     `gorm:"not null;default:5368709120" json:"max_space"`
	CreatedAt	time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	Role  		string `json:"role"`
}

func (Orga) TableName() string {
    return "organizations" 
}
