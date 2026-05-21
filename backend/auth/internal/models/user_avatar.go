package models

import (
	"github.com/google/uuid"
	"time"
)

type UserAvatar struct {
	UserID		uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Data		[]byte    `gorm:"type:bytea;not null" json:"-"`
	ContentType	string    `gorm:"type:varchar(50);not null" json:"content_type"`
	UpdatedAt	time.Time `gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (UserAvatar) TableName() string {
	return "user_avatars"
}
