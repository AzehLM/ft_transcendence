import { useState, useEffect, useCallback } from "react";
import { FilesService } from "../../services/files.service";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownloadOrg } from "../../hooks/useE2EEDownloadOrg";
import styles from "../Dashboard/Dashboard.module.css";
import statusStyles from "../Organizations/Organizations.module.css"
import { OrgLayout } from "./OrgLayout";
import { Breadcrumb } from "../../components/Breadcrumb";
import { UploadStatus } from "../../components/UploadStatus.tsx";
import { FolderCard } from "../../components/FolderCard";
import { FileCard } from "../../components/FileCard"
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { ActionButtons } from "../../components/ActionButtons";
import { useNotifications } from "../../contexts/NotificationContext";
import { OrgKeyProvider } from "../../contexts/OrgKeyContext";
import { useFileManager } from "../../hooks/useFileManager";
import { FeedbackMessageContainer } from "../../components/FeedbackMessageContainer";

export default function OrgFilesPage() {
  const { id } = useParams();
  const { folderId } = useParams();
  const { registerListener, unregisterListener } = useNotifications();
  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");
  const [myRole, setMyRole] = useState<string>("");
  const [userID, setUserID] = useState<string>("");
  const [orgError, setOrgError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (res.status === 404 || res.status === 400) { navigate("/404"); return; }
        if (!res.ok) {
            setOrgError("Failed to fetch Organization.")
            throw new Error("Failed to fetch Organization.");
        }
        return res.json();
      })
      .then(data => { if (data) { setOrgName(data.name); setOrgDesc(data.description); setMyRole(data.role); setUserID(data.user_id)} })
      .catch(() => setOrgName("Unknown"));
  }, [id]);



    const loadFn = useCallback(
        () => FilesService.getOrgaFilesFolders(folderId ?? "00000000-0000-0000-0000-000000000000", id!),
        [folderId, id]
    );

    const {
        files, folders, loading, mainError,
        breadcrumbs, loadFiles,
        messages: fileMessages, addMessage: addFileMessage, removeMessage: removeFileMessage,
        handleDeleteFile, handleDeleteFolder,
        handleRenameFolder, handleMoveFolder, handleMoveFile,
        handleBreadcrumbClick,
    } = useFileManager(
        loadFn,
        (folderId) => folderId ? `/orgs/${id}/folder/${folderId}` : `/orgs/${id}/files`
    );

    useEffect(() => {
        const handleFilesChange = () => {
            loadFiles();
        };

        const handleOrgaRenamed = (data: any) => {
            if (data && data.new_name) {
                setOrgName(data.new_name);
            }
        };

        const handleRoleUpdated = (data: any) => {
            if (data && data.user_id === userID && data.role) {
                setMyRole(data.role);
            }
        };

        registerListener("file_uploaded", handleFilesChange);
        registerListener("file_deleted", handleFilesChange);
        registerListener("file_moved", handleFilesChange);
        registerListener("folder_created", handleFilesChange);
        registerListener("folder_deleted", handleFilesChange);
        registerListener("folder_renamed", handleFilesChange);
        registerListener("folder_moved", handleFilesChange);
        registerListener("ORGA_RENAMED", handleOrgaRenamed);
        registerListener("ROLE_UPDATED", handleRoleUpdated);

        return () => {
            unregisterListener("file_uploaded", handleFilesChange);
            unregisterListener("file_deleted", handleFilesChange);
            unregisterListener("file_moved", handleFilesChange);
            unregisterListener("folder_created", handleFilesChange);
            unregisterListener("folder_deleted", handleFilesChange);
            unregisterListener("folder_renamed", handleFilesChange);
            unregisterListener("folder_moved", handleFilesChange);
            unregisterListener("ORGA_RENAMED", handleOrgaRenamed);
            unregisterListener("ROLE_UPDATED", handleRoleUpdated);
        };
    }, [registerListener, unregisterListener, loadFiles, userID]);

    const { uploadFile, uploads } = useE2EEUpload(() => {
        loadFiles();
    }, id, folderId);
    
    const activeUploads = Object.values(uploads);
    const isUploading = activeUploads.some(u => u.isUploading);

    const { 
        downloadAndDecryptOrg, isDownloading,
        messages: downloadMessages, removeMessage: removeDownloadMessage,
    } = useE2EEDownloadOrg();

    const allMessages = [...fileMessages, ...downloadMessages];
    const handleRemoveMessage = (id: string) => {
        removeFileMessage(id);
        removeDownloadMessage(id);
    };

    const handleDownload = (fileId: string) => {
        downloadAndDecryptOrg(fileId, id!);
    };

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [folderError, setFolderError] = useState<string | null>(null);

    const handleCreateFolderSubmit = async () => {
        if (!folderName.trim()) {
            setFolderError("Invalid Name")
            return;
        }
        try {
            await FilesService.createFolder(folderName, folderId, id);
            await loadFiles();
            addFileMessage(`Folder "${folderName}" created`, "success");
        
        } catch (err: any) {
            addFileMessage(err.message || "Failed to create folder.", "error");
        }
        setFolderError(null);
        setFolderName("");
        setIsFolderModalOpen(false);
    };

  return (
    <>
    <OrgLayout orgName={orgName} orgDesc={orgDesc}>
      <FeedbackMessageContainer messages={allMessages} onRemove={handleRemoveMessage} />

      <OrgKeyProvider orgId={id}>
      <div className={styles.container}>
        <ConfirmationModal
        isOpen={isFolderModalOpen}
        fileName={folderName}
        onConfirm={handleCreateFolderSubmit}
        onCancel={() => { setIsFolderModalOpen(false); setFolderError(null); }}
        isCreateFolder={true}
        inputValue={folderName}
        onInputChange={setFolderName}
        errorMessage={folderError ?? undefined}
        />
        <div className={styles.contentSection}>
            <div className={styles.headerRow}>
                <div className={styles.titleGroup}>
                    <h1>
                        Organization Space
                    </h1>
                    <h2 className={styles.subtitle}>
                        All files and folders
                    </h2>
                </div>

                <ActionButtons onUploadFile={uploadFile}
                                onCreateFolder={() => setIsFolderModalOpen(true)}
                  />
            </div>

            <div className={styles.uploadContainer}>
                <Breadcrumb items={breadcrumbs} onNavigate={handleBreadcrumbClick} />
                <UploadStatus
                    uploads={activeUploads}
                    mainError={mainError}
                />
            </div>

            {loading ? (
                <p>Loading files...</p>
                ) : orgError ? (
                    <div className={`${statusStyles.statusMessage} ${statusStyles.error}`}>
                        {orgError}
                    </div>
                ) : files.length === 0 && folders.length === 0 && !mainError ? (
                <p className={styles.noFile}>No files yet.</p>
                ) : (
                <div className={styles.contentsGrid} style={{ opacity: isDownloading || isUploading ? 0.5 : 1 }}>
                    {
                        folders.length > 0 && (
                            <div className={styles.itemsGrid}>
                                <p className={styles.itemsTitle}>FOLDERS</p>
                                <div className={styles.foldersGrid}>
                                    {folders.map(folder => (
                                    <FolderCard
                                        key={folder.id}
                                        id={folder.id}
                                        name={folder.name}
                                        createdAt={folder.created_at}
                                        onDelete={handleDeleteFolder}
                                        onRename={handleRenameFolder}
                                        onMove={handleMoveFolder}
                                        orgId={id}
                                        role={myRole}
                                        owner_user_id={folder.owner_user_id}
                                        user_id={userID}
                                    />
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    {
                        files.length > 0 && (
                            <div className={styles.itemsGrid}>
                                <p className={styles.itemsTitle}>FILES</p>
                                <div className={styles.filesList}>
                                    {files.map(file => (
                                    <FileCard
                                        key={file.id}
                                        id={file.id}
                                        name={file.name}
                                        fileSize={file.file_size}
                                        onDelete={handleDeleteFile}
                                        onDownload={handleDownload}
                                        onMove={handleMoveFile}
                                        orgId={id}
                                        role={myRole}
                                        owner_user_id={file.owner_user_id}
                                        user_id={userID}
                                    />
                                    ))}
                                </div>
                            </div>
                        )
                    }
                </div>
            )}
          </div>
      </div>
      </OrgKeyProvider>
    </OrgLayout>
    </>
  );
}