import { FileCard } from "../../components/FileCardOrg"
import { ActionButtons } from "../../components/ActionButtons"
import { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { FilesService, FileItem, FolderItem } from "../../services/files.service";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownload } from "../../hooks/useE2EEDownload";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { Breadcrumb } from "../../components/Breadcrumb";
import { UploadStatus } from "../../components/UploadStatus.tsx";
import { FolderCard } from "../../components/FolderCard";

export default function DashboardPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const { folderId } = useParams();
    const navigate = useNavigate();

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [folderError, setFolderError] = useState<string | null>(null);

    useEffect(() => {
    const load = async () => {
        try {
        setLoading(true);
        setError(null);
        setSuccess("");
        const response = folderId
            ? await FilesService.getFolderContents(folderId)
            : await FilesService.getAllFiles();
            setFiles(response.files || []);
            setFolders(response.folders || [])
        } catch (err: any) { // not a good solution to use any but I don't have another one yet
            if (err.status === 400 || err.status === 404) {
                navigate("/404");
                return;
            }
        console.log("Failed to load files:", err);
        setError("Failed to load files.");
        } finally {
        setLoading(false);
        }
    };
    load();
    }, [folderId]);

    const loadFiles = async () => {
        setSuccess("");
        setError(null);
    const response = folderId
        ? await FilesService.getFolderContents(folderId)
        : await FilesService.getAllFiles();
        setFiles(response.files || []);
        setFolders(response.folders || [])
    };

    const { uploadFile, uploads } = useE2EEUpload(() => {
    setSuccess("");
    setError(null);
    loadFiles();
    }, undefined, folderId);

    const activeUploads = Object.values(uploads);
    const isUploading = activeUploads.some(u => u.isUploading);

    const { downloadAndDecrypt, downloadStatus, isDownloading } = useE2EEDownload();

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

     const handleDeleteFile = async (id: string) => {
        setSuccess("");
        setError(null);
         try {
             await FilesService.deleteFile(id);
             await loadFiles();
             setSuccess("File deleted");
         } catch (err) {
             const errorMessage = err instanceof Error ? err.message : "Unknown error";
             console.error("Failed to delete file:", err);
             setError(`Failed to delete file: ${errorMessage}`);
         }
    };

    const handleRenameFolder = async (id: string, newName: string) => {
        setSuccess("");
        setError(null);
        try {
            await FilesService.updateFolder(id, {
                name: newName,
            });
            await loadFiles();
            setSuccess("Folder renamed");
        } catch (err: any) {
            if (err.status === 404) {
                setError("Folder not found.");
            } else {
                setError(err.message || "Failed to rename folder.");
            }
        }
    };

    const handleMoveFolder = async (id: string, newParentId: string | null) => {
        setSuccess("");
        setError(null);
        try {
            await FilesService.updateFolder(id, {
                parent_id: newParentId,
            });
            await loadFiles();
            setSuccess("Folder moved");
        } catch (err: any) {
            if (err.status === 404) {
                setError("File or folder not found.");
            } else {
                setError(err.message || "Failed to move.");
            }
        }
    };


    const handleMoveFile = async (id: string, newParentId: string | null) => {
        setSuccess("");
        setError(null);
        try {
            await FilesService.moveFile(id, newParentId);
            await loadFiles();
            setSuccess("File moved");
        } catch (err: any) {
            if (err.status === 404) {
                setError("File or folder not found.");
            } else {
                setError(err.message || "Failed to move.");
            }
        }
    };

     const handleDeleteFolder = async (id: string) => {
        setSuccess("");
        setError(null);
         try {
             await FilesService.deleteFolder(id);
             await loadFiles();
             setSuccess("Folder deleted");
         } catch (err) {
             const errorMessage = err instanceof Error ? err.message : "Unknown error";
             console.error("Failed to delete folder:", err);
             setError(`Failed to delete folder: ${errorMessage}`);
         }
    };

    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Root" }
    ]);

    const handleBreadcrumbClick = (item: { id: string | null }, index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    if (item.id) {
        navigate(`/dashboard/folder/${item.id}`);
    } else {
        navigate("/dashboard");
    }
    };

    useEffect(() => {
    if (!folderId) {
        setBreadcrumbs([{ id: null, name: "Root" }]);
        return;
    }

    FilesService.getFolderPath(folderId)
        .then(data => {
        setBreadcrumbs([
            { id: null, name: "Root" },
            ...data.map((f) => ({ id: f.id, name: f.name }))
        ]);
        })
        .catch(() => setBreadcrumbs([{ id: null, name: "Root" }]));
    }, [folderId]);

    const [hideMessage, setHideMessage] = useState(false);

    useEffect(() => {
        if (success || error) {
            setHideMessage(false);

            const timer = setTimeout(() => {
                setHideMessage(true);

                setTimeout(() => {
                    setSuccess('');
                    setError('');
                }, 400);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [success, error]);

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

            <ActionButtons onUploadFile={uploadFile}
                           onCreateFolder={() => setIsFolderModalOpen(true)}
             />

            <div className={styles.headerSection}>
                <div className={styles.titleGroup}>
                    <h1>
                        Personal space
                    </h1>
                    <h2 className={styles.subtitle}>
                        All files and folders
                    </h2>
                </div>

                <div className={styles.uploadContainer}>
                    <Breadcrumb items={breadcrumbs} onNavigate={handleBreadcrumbClick} />
                    <UploadStatus
                        uploads={activeUploads}
                        downloadStatus={downloadStatus}
                        error={error}
                        success={success}
                        hideMessage={hideMessage}
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
                        {files.map((file) => (
                            <FileCard key={file.id} id={file.id} name={file.name} onDelete={handleDeleteFile} onDownload={downloadAndDecrypt} onMove={handleMoveFile} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}