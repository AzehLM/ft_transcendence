package workers

import (
	"context"
	"encoding/json"
	"log"

	files "backend/storage/internal"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type EventPublisher struct {
	redis	*redis.Client
}

func NewEventPublisher(redis *redis.Client) *EventPublisher {
	return &EventPublisher{redis: redis}
}

func (p *EventPublisher) publish(ctx context.Context, ownerID uuid.UUID, orgID *uuid.UUID, event WSEvent) error {

	var channel string
	if orgID != nil {
		channel = channelOrgEvents + orgID.String()
	} else {
		channel = channelUserEvents + ownerID.String()
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	if err := p.redis.Publish(ctx, channel, payload).Err(); err != nil {
		log.Printf("[EventPublisher] Failed to publish on %s: %v", channel, err) // pas de remonté d'erreur ici c'est OK si ca fail
	}

	return nil
}

func (p *EventPublisher) PublishFileUploaded(ctx context.Context, file *files.File) error {

	payload := FileUploadedPayload{
		FileID:		file.ID,
		FolderID:	file.FolderID,
		OwnerID:	file.OwnerUserID,
		OrgID:		file.OrgID,
		Name:		file.Name,
		FileSize:	file.FileSize,
	}

	event := WSEvent{
		Type:	EventFileUploaded,
		Data:	payload,
	}

	return p.publish(ctx, file.OwnerUserID, file.OrgID, event)
}

func (p *EventPublisher) PublishFileDeleted(ctx context.Context, file *files.File) error {

	payload := FileDeletedPayload{
		FileID:		file.ID,
		FolderID:	file.FolderID,
		OwnerID:	file.OwnerUserID,
		OrgID:		file.OrgID,
	}

	event := WSEvent{
		Type:	EventFileDeleted,
		Data:	payload,
	}

	return p.publish(ctx, file.OwnerUserID, file.OrgID, event)
}


// expects file.FolderID to still hold the OldFolderID at call time
func (p *EventPublisher) PublishFileMoved(ctx context.Context, file *files.File, newFolderID *uuid.UUID) error {

	payload := FileMovedPayload{
		FileID:			file.ID,
		OwnerID:		file.OwnerUserID,
		OrgID:			file.OrgID,
		OldFolderID:	file.FolderID,
		NewFolderID:	newFolderID,
	}

	event := WSEvent{
		Type:	EventFileMoved,
		Data:	payload,
	}

	return p.publish(ctx, file.OwnerUserID, file.OrgID, event)
}

func (p *EventPublisher) PublishFolderCreated(ctx context.Context, folder *files.Folder) error {

	payload := FolderCreatedPayload{
		FolderID:	folder.ID,
		ParentID:	folder.ParentID,
		OwnerID:	folder.OwnerUserID,
		OrgID:		folder.OrgID,
		Name:		folder.Name,
	}

	event := WSEvent{
		Type:	EventFolderCreated,
		Data:	payload,
	}

	return p.publish(ctx, folder.OwnerUserID, folder.OrgID, event)
}

func (p *EventPublisher) PublishFolderDeleted(ctx context.Context, folder *files.Folder) error {

	payload := FolderDeletedPayload{
		FolderID:	folder.ID,
		ParentID:	folder.ParentID,
		OwnerID:	folder.OwnerUserID,
		OrgID:		folder.OrgID,
	}

	event := WSEvent{
		Type:	EventFolderDeleted,
		Data:	payload,
	}

	return p.publish(ctx, folder.OwnerUserID, folder.OrgID, event)
}

func (p *EventPublisher) PublishFolderMoved(ctx context.Context, folder *files.Folder, oldParentID *uuid.UUID, newParentID *uuid.UUID) error {

	payload := FolderMovedPayload{
		FolderID:		folder.ID,
		OwnerID:		folder.OwnerUserID,
		OrgID:			folder.OrgID,
		OldParentID:	oldParentID,
		NewParentID:	newParentID,
	}

	event := WSEvent{
		Type:	EventFolderMoved,
		Data:	payload,
	}

	return p.publish(ctx, folder.OwnerUserID, folder.OrgID, event)
}

func (p *EventPublisher) PublishFolderRenamed(ctx context.Context, folder *files.Folder) error {

	payload := FolderRenamedPayload{
		FolderID:		folder.ID,
		ParentID:		folder.ParentID,
		OwnerID:		folder.OwnerUserID,
		OrgID:			folder.OrgID,
		NewName:		folder.Name,
	}

	event := WSEvent{
		Type:	EventFolderRenamed,
		Data:	payload,
	}

	return p.publish(ctx, folder.OwnerUserID, folder.OrgID, event)
}
