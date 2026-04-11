package workers


var (
	// file
	EventFileUploaded = "file_uploaded"
	EventFileDeleted = "file_delete"
	EventFileMoved = "file_moved"
	EventFileRenamed = "file_renamed" // on a dit on fait pas ? je sais plus je regarde apres
	EventFileOrphaned = "file_orphaned"

	// folder
	EventFolderCreated = "folder_created"
	EventFolderDeleted = "folder_deleted"
	EventFolderMoved = "folder_moved"
	EventFolderRenamed = "folder_renamed"
)

type WSEvent struct {
	Type    string      `json:"type"` // ex: MEMBER_ADDED, FILE_UPLOADED
	OrgID   string      `json:"org_id,omitempty"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
