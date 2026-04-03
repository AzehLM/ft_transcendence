package models

import (
	"time"
	"github.com/google/uuid"
)

type OrgaMember struct {
	OrgID  			uuid.UUID `gorm:"type:uuid;primaryKey;not null;foreignKey:OrgID;references:ID;constraint:OnDelete:CASCADE" json:"org_id"`
	UserID				uuid.UUID `gorm:"type:uuid;primaryKey;not null;foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE" json:"user_id"`
    Role				string    `gorm:"size:20;not null;check:role IN ('admin','member')" json:"role"`
    EncOrgPrivKey	[]byte    `gorm:"type:bytea;not null" json:"enc_org_priv_key"`
    JoinedAt			time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"joined_at"`
}

func(OrgaMember) TableName() string {
	return "org_members"
}

type OrgaMemberResponse struct {
	UserID    	uuid.UUID   `json:"user_id"`
	Role  		string `json:"role"`
	Email		string `json:"email"` // not sure
}
	