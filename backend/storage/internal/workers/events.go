package workers

import "github.com/google/uuid"

const (
	// file
	EventFileUploaded = "file_uploaded"
	EventFileDeleted = "file_deleted"
	EventFileMoved = "file_moved"
	EventFileRenamed = "file_renamed" // on a dit on fait pas ?

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

// structs to avoid run-time errors, this makes it type-safe
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

type FileMovedPayload struct {
	FileID		uuid.UUID	`json:"file_id"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
	OldFolderID	*uuid.UUID	`json:"old_folder_id,omitempty"`
	NewFolderID	*uuid.UUID	`json:"new_folder_id,omitempty"`
}

type FileRenamedPayload struct {
	FileID		uuid.UUID	`json:"file_id"`
	FolderID	*uuid.UUID	`json:"folder_id,omitempty"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
	NewName		string		`json:"new_name"`
}

type FolderCreatedPayload struct {
	FolderID	uuid.UUID	`json:"folder_id"`
	ParentID	*uuid.UUID	`json:"parent_id,omitempty"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
	Name		string		`json:"name"`
}

type FolderDeletedPayload struct {
	FolderID	uuid.UUID	`json:"folder_id"`
	ParentID	*uuid.UUID	`json:"parent_id,omitempty"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
}

type FolderMovedPayload struct {
	FolderID	uuid.UUID	`json:"folder_id"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
	OldParentID	*uuid.UUID	`json:"old_parent_id,omitempty"`
	NewParentID	*uuid.UUID	`json:"new_parent_id,omitempty"`
}

type FolderRenamedPayload struct {
	FolderID	uuid.UUID	`json:"folder_id"`
	ParentID	*uuid.UUID	`json:"parent_id,omitempty"`
	OwnerID		uuid.UUID	`json:"owner_id"`
	OrgID		*uuid.UUID	`json:"org_id,omitempty"`
	NewName		string		`json:"new_name"`
}
