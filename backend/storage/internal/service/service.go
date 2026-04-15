package service

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"backend/storage/internal"

	"backend/storage/internal/workers"
	"backend/shared/rbac"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"gorm.io/gorm"
)

var (
	ErrForbidden = errors.New("forbidden")
	ErrNotFound = errors.New("not found")
	ErrQuotaExceeded = errors.New("quota exceeded")

	ErrFolderNotEmpty = errors.New("folder not empty")
	ErrCyclicMove = errors.New("cannot move folder into itself or one of its descendants")
	ErrInvalidParent = errors.New("invalid parent")
	ErrInvalidName = errors.New("invalid folder name")
)

// business logic contract
type StorageService interface {
	// File part
	RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error)
	FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) (uuid.UUID, error)
	DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error)
	DeleteFile(userID uuid.UUID, fileID uuid.UUID) error
	MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error
	GetFileInfo(userID uuid.UUID, fileID uuid.UUID) (file *storage.File, err error)

	// Folder part
	CreateFolder(userID uuid.UUID, name string, parentID *uuid.UUID, orgID *uuid.UUID) (uuid.UUID, error)
	DeleteFolder(userID uuid.UUID, folderID uuid.UUID) error
	UpdateFolder(userID uuid.UUID, folderID uuid.UUID, newName *string, newParentID **uuid.UUID) error

	ListPersonalContents(userID uuid.UUID, parentID *uuid.UUID) ([]storage.Folder, []storage.File, error)
	ListFolderContents(userID uuid.UUID, folderID *uuid.UUID) ([]storage.Folder, []storage.File, error)
	ListOrgContents(userID uuid.UUID, orgID uuid.UUID, folderID uuid.UUID) ([]storage.Folder, []storage.File, error)
}

type storageService struct {
	repo		storage.StorageRepository
	minioClient	*minio.Client
	publisher	*workers.EventPublisher
	rbac		rbac.Checker
}

func NewStorageService(repo storage.StorageRepository, minioClient *minio.Client, publisher *workers.EventPublisher, checker rbac.Checker) StorageService {
	return &storageService{
		repo:			repo,
		minioClient:	minioClient,
		publisher:		publisher,
		rbac:			checker,
	}
}

/* interface methods*/

// RequestUploadURL requests a presignedURL to the minio client and returns it.
// File requested for upload are in a PENDING state until it has been fully uploaded to the minio storage service, where it then updates this status to ACTIVE via FinalizeUpload
// The quota check is done via GetUserSpace so between a RequestUploadURL call and a FinalizeUpload call, it is possible that users have no storage space left
func (s *storageService) RequestUploadURL(userID uuid.UUID, fileSize int64, folderID *uuid.UUID, orgID *uuid.UUID) (presignedURL string, objectID uuid.UUID, err error) {

	if err := s.rbac.CanCreateInFolder(userID, folderID, orgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return "", uuid.Nil, ErrForbidden
		}
		if errors.Is(err, rbac.ErrNotFound) {
			return "", uuid.Nil, ErrNotFound
		}
		return "", uuid.Nil, err
	}

	ctx := context.TODO()
	objectID = uuid.New()

	var used, max int64
	used, max, err = s.repo.GetUserSpace(userID)
	if err != nil {
		return "", uuid.Nil, err
	}

	if used + fileSize > max {
		return "", uuid.Nil, ErrQuotaExceeded
	}

	newFile := &storage.File{
		ID:             uuid.New(),
		OwnerUserID:    userID,
		OrgID:          orgID,
		FolderID:       folderID,
		Name:           "",
		FileSize:       fileSize,
		MinioObjectKey: objectID,
		EncryptedDEK:   []byte{},
		IV:             []byte{},
		Status:         "PENDING",
	}

	if err = s.repo.InsertPendingFile(newFile); err != nil {
		return "", uuid.Nil, err
	}

	// default ctx for now, ostrom as the root repository, will be be modified depending on users path ?
	rawURL, err := s.minioClient.PresignedPutObject(ctx, "ostrom", objectID.String(), 15*time.Minute)
	if err != nil {
		return "", uuid.Nil, err
	}

	// replace hardcoded values with env var ?
	presignedURL = strings.Replace(rawURL.String(), "http://minio:9000", "https://localhost:4242/storage", 1)

	return presignedURL, objectID, err
}


// FinalizeUpload activates an object uploaded to the minio storage service and updates the user used space
// It fetches twice the data of the objectID as we need updated data to publish the correct values to the redis client
func (s *storageService) FinalizeUpload(userID uuid.UUID, objectID uuid.UUID, name string, encryptedDEK []byte, iv []byte, orgID *uuid.UUID) (uuid.UUID, error) {

	file, err := s.repo.FindByObjectID(objectID)
	if err != nil {
		return uuid.Nil, err
	}

	// activates file in DB
	if err := s.repo.ActivateFile(objectID, name, encryptedDEK, iv, orgID, userID); err != nil {
		return uuid.Nil, err
	}


	// incrementing space used by user in DB via a single `UPDATE users SET used_space = used_space + ? WHERE id = ?` query to avoid dataraces
	var ok bool
	ok, err = s.repo.TryIncrementUserUsedSpace(userID, file.FileSize)
	if err != nil {
		return uuid.Nil, err
	}

	if !ok {
		// TODO(redis): `file_orphaned` event with {object_key, file_id} (stream)
		// so the cleanup worker removes the MinIO blob and the PENDING row
		// Until the event bus is wired, quota-rejected uploads leave an orphan blob + PENDING row
		return uuid.Nil, ErrQuotaExceeded
	}

	// update of file here so the event does't return an empty name = ""
	file, err = s.repo.FindByID(file.ID) // calling FindByID and not FindByObjectID because the file is not PENDING anymore
	if err != nil {
		return uuid.Nil, err
	}

	// _ because we ignore the return value of this call (fire-and-forget event)
	_ = s.publisher.PublishFileUploaded(context.TODO(), file)

	return file.ID, nil
}

func (s *storageService) DownloadFile(userID uuid.UUID, fileID uuid.UUID) (presignedURL string, encryptedDEK []byte, iv []byte, name string, err error) {

	ctx := context.TODO()

	// gets the file in DB
	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil, nil, "", ErrNotFound
	} else if err != nil {
		return "", nil, nil, "", err
	}

	if err := s.rbac.CanReadFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return "", nil, nil, "", ErrForbidden
		}
		return "", nil, nil, "", err
	}

	// https://docs.min.io/enterprise/aistor-object-store/developers/sdk/go/api/#presignedgetobjectctx-contextcontext-bucketname-objectname-string-expiry-timeduration-reqparams-urlvalues-urlurl-error
	// generate presigned URL (GET)
	// leaving comments for now until it works with the front
	rawURL, err := s.minioClient.PresignedGetObject(ctx, "ostrom", file.MinioObjectKey.String(), 5 * time.Minute, nil)
	if err != nil {
		return "", nil, nil, "", err
	}

	// replace hardcoded values with env var ?
	presignedURL = strings.Replace(rawURL.String(), "http://minio:9000", "https://localhost:4242/storage", 1)

	return presignedURL, file.EncryptedDEK, file.IV, file.Name, nil
}

func (s *storageService) DeleteFile(userID uuid.UUID, fileID uuid.UUID) error {

	ctx := context.TODO()

	// gets the file in DB
	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	if err := s.rbac.CanWrite(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		return err
	}

	// suppress file metadata in DB
	if err := s.repo.DeleteFile(fileID); err != nil {
		return err
	}

	// suppress actual file in minio
	if err := s.minioClient.RemoveObject(ctx, "ostrom", file.MinioObjectKey.String(), minio.RemoveObjectOptions{}); err != nil {
		return err
	}

	if err := s.repo.DecrementUserUsedSpace(userID, file.FileSize); err != nil {
		return err
	}

	_ = s.publisher.PublishFileDeleted(context.TODO(), file)

	return nil
}

func (s *storageService) MoveFile(userID uuid.UUID, fileID uuid.UUID, folderID *uuid.UUID) error {

	file, err := s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	} else if err != nil {
		return err
	}

	if err := s.rbac.CanWrite(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		return err
	}

	if err := s.rbac.CanCreateInFolder(userID, folderID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		if errors.Is(err, rbac.ErrNotFound) {
			return ErrNotFound
		}
		return err
	}

	rows, err := s.repo.UpdateFileFolder(fileID, folderID)
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrNotFound
	}

	_ = s.publisher.PublishFileMoved(context.TODO(), file, folderID)

	return nil
}

func (s *storageService) GetFileInfo(userID uuid.UUID, fileID uuid.UUID) (file *storage.File, err error) {

	file, err = s.repo.FindByID(fileID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}

	if err := s.rbac.CanReadFile(userID, file.OwnerUserID, file.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return nil, ErrForbidden
		}
		return nil, err
	}

	return file, nil
}



// folders

func (s *storageService) CreateFolder(userID uuid.UUID, name string, parentID *uuid.UUID, orgID *uuid.UUID) (uuid.UUID, error) {

	if name == "" || utf8.RuneCountInString(name) > 100 {
		return uuid.Nil, ErrInvalidName
	}

	if err := s.rbac.CanCreateInFolder(userID, parentID, orgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return uuid.Nil, ErrForbidden
		}
		if errors.Is(err, rbac.ErrNotFound) {
			return uuid.Nil, ErrInvalidParent
		}
		return uuid.Nil, err
	}

	folder := storage.Folder{
		ID:				uuid.New(),
		OwnerUserID:	userID,
		OrgID:			orgID,
		ParentID:		parentID,
		Name:			name,
	}

	if err := s.repo.CreateFolder(&folder); err != nil {
		return uuid.Nil, err
	}

	_ = s.publisher.PublishFolderCreated(context.TODO(), &folder)
	return folder.ID, nil
}

func (s *storageService) DeleteFolder(userID uuid.UUID, folderID uuid.UUID) error {
	folder, err := s.repo.FindFolderByID(folderID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}

	if err != nil {
		return err
	}

	if err := s.rbac.CanWrite(userID, folder.OwnerUserID, folder.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		return err
	}

	empty, err := s.repo.IsFolderEmpty(folderID)
	if err != nil {
		return err
	}

	if !empty {
		return ErrFolderNotEmpty
	}

	if err := s.repo.DeleteFolder(folderID); err != nil {
		return err
	}

	_ = s.publisher.PublishFolderDeleted(context.TODO(), folder)
	return nil
}

// UpdateFolder takes a **uuid.UUID for the newParentID to identify an explicit null vs not supplied newParentID
// There is a logic to allow users to rename their folder (published redis event as well) but you tell me if we delete it or not
func (s *storageService) UpdateFolder(userID uuid.UUID, folderID uuid.UUID, newName *string, newParentID **uuid.UUID) error {
	folder, err := s.repo.FindFolderByID(folderID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}

	if err != nil {
		return err
	}

	if err := s.rbac.CanWrite(userID, folder.OwnerUserID, folder.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return ErrForbidden
		}
		return err
	}

	oldName := folder.Name
	oldParentID := folder.ParentID

	updates := make(map[string]interface{})

	if newName != nil {
		if *newName == "" || utf8.RuneCountInString(*newName) > 100 {
			return ErrInvalidName
		}
		updates["name"] = *newName
	}

	if newParentID != nil {
		target := *newParentID // can be nil (move to root)

		if target != nil {
			newParent, err := s.repo.FindFolderByID(*target)
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrInvalidParent
			}

			if err != nil {
				return err
			}

			sameScope := false
			if folder.OrgID == nil && newParent.OrgID == nil {
				sameScope = folder.OwnerUserID == newParent.OwnerUserID
			} else if folder.OrgID != nil && newParent.OrgID != nil {
				sameScope = *folder.OrgID == *newParent.OrgID
			}

			if !sameScope {
				return ErrInvalidParent
			}

			isDescendant, err := s.repo.IsDescendant(*target, folderID)
			if err != nil {
				return err
			}

			if isDescendant {
				return ErrCyclicMove
			}
		}

		updates["parent_id"] = target
	}


	if len(updates) == 0 {
		return nil
	}

	if err := s.repo.UpdateFolder(folderID, updates); err != nil {
		return err
	}

	if newName != nil {
		folder.Name = *newName
	}

	if newParentID != nil {
		folder.ParentID = *newParentID
	}

	if newName != nil && *newName != oldName {
		_ = s.publisher.PublishFolderRenamed(context.TODO(), folder)
	}

	if newParentID != nil {
		if !uuidPtrEqual(oldParentID, *newParentID) {
			_ = s.publisher.PublishFolderMoved(context.TODO(), folder, oldParentID, *newParentID)
		}
	}

	return nil
}

// utilitary function
func uuidPtrEqual(oldParentID *uuid.UUID, newParentID *uuid.UUID) bool {
	if oldParentID == nil && newParentID == nil {
		return true
	}

	if oldParentID == nil || newParentID == nil {
		return false
	}

	return *oldParentID == *newParentID
}

func (s *storageService) ListPersonalContents(userID uuid.UUID, parentID *uuid.UUID) ([]storage.Folder, []storage.File, error) {
	if parentID != nil {
		folder, err := s.repo.FindFolderByID(*parentID)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}

		if err != nil {
			return nil, nil, err
		}

		// check OrgID != nil so we are sure it belongs to someone and not an organization
		if folder.OwnerUserID != userID || folder.OrgID != nil {
			return nil, nil, ErrForbidden
		}
	}

	folders, files, err := s.repo.ListFolderContents(userID, parentID)
	if err != nil {
		return nil, nil, err
	}

	return folders, files, nil
}

func (s *storageService) ListFolderContents(userID uuid.UUID, folderID *uuid.UUID) ([]storage.Folder, []storage.File, error) {

	// guards for the dereference coming after
	if folderID == nil {
		return nil, nil, ErrNotFound
	}

	folder, err := s.repo.FindFolderByID(*folderID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, ErrNotFound
	}

	if err != nil {
		return nil, nil, err
	}

	if folder.OwnerUserID != userID || folder.OrgID != nil {
		return nil, nil, ErrForbidden
	}

	folders, files, err := s.repo.ListFolderContents(userID, folderID)
	if err != nil {
		return nil, nil, err
	}

	return folders, files, nil
}

func (s * storageService) ListOrgContents(userID uuid.UUID, orgID uuid.UUID, folderID uuid.UUID) ([]storage.Folder, []storage.File, error) {
	folder, err := s.repo.FindFolderByID(folderID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, ErrNotFound
	}

	if err != nil {
		return nil, nil, err
	}

	if folder.OrgID == nil || *folder.OrgID != orgID {
		return nil, nil, ErrNotFound
	}

	if err := s.rbac.CanReadFile(userID, folder.OwnerUserID, folder.OrgID); err != nil {
		if errors.Is(err, rbac.ErrForbidden) {
			return nil, nil, ErrForbidden
		}
		return nil, nil, err
	}

	folders, files, err := s.repo.ListOrgFolderContents(orgID, folderID)
	if err != nil {
		return nil, nil, err
	}

	return folders, files, nil
}
