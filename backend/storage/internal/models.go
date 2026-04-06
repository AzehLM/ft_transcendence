package storage

import (
	"time"

	"github.com/google/uuid"
)

type File struct {
	ID				uuid.UUID	`gorm:"type:uuid;primaryKey" json:"id"`
	OwnerUserID		uuid.UUID	`gorm:"type:uuid;not null" json:"owner_user_id"`
	OrgID			*uuid.UUID	`gorm:"type:uuid" json:"org_id"`
	FolderID		*uuid.UUID	`gorm:"type:uuid" json:"folder_id"`
	Name			string		`gorm:"size:100;not null" json:"name"`
	FileSize		int64		`gorm:"not null" json:"file_size"`
	MinioObjectKey	uuid.UUID	`gorm:"type:uuid;uniqueIndex;not null" json:"minio_object_key"`
	EncryptedDEK	[]byte		`gorm:"type:bytea;not null" json:"encrypted_dek"`
	IV				[]byte		`gorm:"type:bytea;not null" json:"iv"`
	Status			string		`gorm:"size:20;not null;default:'PENDING'" json:"status"`
	CreatedAt		time.Time	`gorm:"type:timestamptz;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// unnecessary as GORM looks for a table as its plural in snake_case of the struct.
// struct File is identified by GORM as files
// File -> files
// but for homogeneity, to match what you've done I'm adding it just in case

func (File) TableName() string {
	return "files"
}
