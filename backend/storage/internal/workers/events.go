package workers

import "github.com/google/uuid"

const (
	// file
	EventFileUploaded = "file_uploaded"
	EventFileDeleted = "file_deleted"
	EventFileMoved = "file_moved"
	EventFileRenamed = "file_renamed" // on a dit on fait pas ? je sais plus je regarde apres

	// Redis streams, cross-service cleanup
	EventFileOrphaned = "file_orphaned"

	// folder
	EventFolderCreated = "folder_created"
	EventFolderDeleted = "folder_deleted"
	EventFolderMoved = "folder_moved"
	EventFolderRenamed = "folder_renamed"
)

const (
	// channels
	channelUserEvents = "user_events:"
	channelOrgEvents = "org_events:"
)

// TODO: mettre en shared ?
type WSEvent struct {
	Type    string      `json:"type"` // ex: MEMBER_ADDED, FILE_UPLOADED
	OrgID   string      `json:"org_id,omitempty"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// struct to avoid run-time errors, this makes it type-safe
// the compiler will tell if there is a missmatched name
type FileUploadedPayload struct {
	FileID		uuid.UUID	`json:"file_id"`
	FolderID	*uuid.UUID	`json:"folder_id,omitempty"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
	Name		string		`json:"name"`
	FileSize	int64		`json:"file_size"`
}

type FileDeletedPayload struct {
	FileID		uuid.UUID	`json:"file_id"`
	FolderID	*uuid.UUID	`json:"folder_id,omitempty"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
}
