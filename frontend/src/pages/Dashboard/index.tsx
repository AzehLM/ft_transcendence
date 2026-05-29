import { FileCard } from "../../components/FileCard"
import { ActionButtons } from "../../components/ActionButtons"
import { useState, useEffect, useCallback } from "react";
import styles from "./Dashboard.module.css";
import { FilesService } from "../../services/files.service";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownload } from "../../hooks/useE2EEDownload";
import { useParams } from "react-router-dom";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { Breadcrumb } from "../../components/Breadcrumb";
import { UploadStatus } from "../../components/UploadStatus.tsx";
import { FolderCard } from "../../components/FolderCard";
import { useNotifications } from "../../contexts/NotificationContext";
import { useFileManager } from "../../hooks/useFileManager";

export default function DashboardPage() {
    const { folderId } = useParams();
    const { registerListener, unregisterListener } = useNotifications();
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [folderError, setFolderError] = useState<string | null>(null);

    const loadFn = useCallback(
        () => folderId ? FilesService.getFolderContents(folderId) : FilesService.getAllFiles(),
        [folderId]
    );

    const {
        files, folders, loading, error, success,
        breadcrumbs, hideMessage, setError, setSuccess, loadFiles,
        handleDeleteFile, handleDeleteFolder,
        handleRenameFolder, handleMoveFolder, handleMoveFile,
        handleBreadcrumbClick,
    } = useFileManager(
        loadFn,
        (folderId) => folderId ? `/dashboard/folder/${folderId}` : "/dashboard"
    );

    useEffect(() => {
        const handleFilesChange = () => {
            loadFiles();
        };

        registerListener("file_uploaded", handleFilesChange);
        registerListener("file_deleted", handleFilesChange);
        registerListener("file_moved", handleFilesChange);
        registerListener("folder_created", handleFilesChange);
        registerListener("folder_deleted", handleFilesChange);
        registerListener("folder_renamed", handleFilesChange);
        registerListener("folder_moved", handleFilesChange);

        return () => {
            unregisterListener("file_uploaded", handleFilesChange);
            unregisterListener("file_deleted", handleFilesChange);
            unregisterListener("file_moved", handleFilesChange);
            unregisterListener("folder_created", handleFilesChange);
            unregisterListener("folder_deleted", handleFilesChange);
            unregisterListener("folder_renamed", handleFilesChange);
            unregisterListener("folder_moved", handleFilesChange);
        };
    }, [registerListener, unregisterListener, loadFiles]);
    const { uploadFile, uploads } = useE2EEUpload(() => {
        setSuccess("");
        setError(null);
        loadFiles();
    }, undefined, folderId);

    const activeUploads = Object.values(uploads);
    const isUploading = activeUploads.some(u => u.isUploading);

    const { downloadAndDecrypt, downloadStatus, isDownloading, hideDownloadMessage, downloadError } = useE2EEDownload();

    const handleCreateFolderSubmit = async () => {
        setSuccess("");
        setError(null);
        if (!folderName.trim()) {
            setFolderError("Invalid Name")
            return;
        }
        try {
            await FilesService.createFolder(folderName, folderId);
            await loadFiles();
            setSuccess("Folder created");
        } catch (err: any) {
            setError(err.message || "Failed to create folder.");
            setFolderName("");
            setIsFolderModalOpen(false);
        }
        setFolderError("")
        setFolderName("");
        setIsFolderModalOpen(false);
    };

    return (
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
                            Personal space
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
                        downloadStatus={downloadStatus}
                        hideDownloadMessage={hideDownloadMessage}
                        error={error}
                        success={success}
                        hideMessage={hideMessage}
                        downloadError={downloadError}
                    />
                </div>

                {loading ? (
                    <p>Loading files...</p>
                    ) : files.length === 0 && folders.length === 0 ? (
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
                                            onDownload={downloadAndDecrypt}
                                            onMove={handleMoveFile}
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
    );
}
