import { FileCard } from "../../components/FileCard"
import { ActionButtons } from "../../components/ActionButtons"
import { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { FilesService, FileItem, FolderItem } from "../../services/files.service";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownload } from "../../hooks/useE2EEDownload";
import { useParams, useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { ChevronRight } from "lucide-react";
import { folderSchema } from "../../schemas/folder.schema";

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
        setFolderError("");

        const result = folderSchema.safeParse({ name: folderName });
        if(!result.success) {
            setFolderError(result.error.issues[0].message);
            return ;
        }
        try {
            await FilesService.createFolder(result.data.name, folderId);
            await loadFiles();
            setSuccess("Folder created");
        } catch (err: any) {
            setError(err.message || "Failed to create folder.");
        } finally {
            setFolderName("");
            setIsFolderModalOpen(false);
        }
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

    return (
        <div className={styles.page}>
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

            {/* Main content area */}
            <div className={styles.contentArea}>
                <h1 className={styles.title}>
                    Personal space
                </h1>
                <h2 className={styles.subtitle}>
                    All files and folders
                </h2>

                <div className={styles.uploadContainer}>
                    {error && (
                        <div className={`${styles.statusMessage} ${styles.error}`}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className={`${styles.statusMessage} ${success.includes('Erreur') ? styles.error : styles.success}`}>
                            {success}
                        </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 5% 16px" }}>
                    {breadcrumbs.map((item, index) => (
                        <span key={index} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {index > 0 && <ChevronRight size={14} style={{ color: "#999" }} />}
                        <button
                        onClick={() => handleBreadcrumbClick(item, index)}
                        className={`${styles.breadcrumbBtn} ${index === breadcrumbs.length - 1 ? styles.breadcrumbBtnActive : ""}`}
                        >
                        {item.name}
                        </button>
                        </span>
                    ))}
                    </div>

                    {activeUploads.map(upload => (
                        <div key={upload.id} style={{ marginBottom: '20px' }}>
                            <div className={`${styles.statusMessage} ${upload.status.includes('Erreur') ? styles.error : styles.loading}`}>
                                {!upload.status.includes('Erreur') && <span className={styles.statusDot}></span>}
                                {upload.status}
                            </div>

                            <div className={styles.fileInfoCard}>
                                <div className={styles.fileName}>{upload.fileInfo.name}</div>
                                <div className={styles.fileDetails}>
                                    <span><strong>Type:</strong> {upload.fileInfo.type}</span>
                                    <span><strong>Taille:</strong> {upload.fileInfo.size}</span>
                                </div>
                            </div>

                            {upload.progress && (
                                <div className={styles.progressContainer}>
                                    <div className={styles.progressHeader}>
                                        <div className={styles.progressTitleContainer}>
                                            <div className={styles.progressTitle}>Chiffrement & Upload</div>
                                            <div className={styles.progressSubtitle}>{upload.fileInfo.name}</div>
                                        </div>
                                        <div className={styles.progressPercentage}>{upload.progress.percentage}%</div>
                                    </div>
                                    <div className={styles.progressBarContainer}>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${upload.progress.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.progressMetrics}>
                                        <div className={styles.metric}>
                                            <div className={styles.metricLabel}>Vitesse</div>
                                            <div className={styles.metricValue}>
                                                {(upload.progress.speed / (1024 * 1024)).toFixed(2)} MB/s
                                            </div>
                                        </div>
                                        <div className={styles.metric}>
                                            <div className={styles.metricLabel}>Progression</div>
                                            <div className={styles.metricValue}>
                                                {((upload.progress.uploadedBytes) / (1024 * 1024)).toFixed(1)} / {((upload.progress.totalBytes) / (1024 * 1024)).toFixed(0)} MB
                                            </div>
                                        </div>
                                        <div className={styles.metric}>
                                            <div className={styles.metricLabel}>Temps restant</div>
                                            <div className={styles.metricValue}>
                                                {Math.round(upload.progress.remainingTime)}s
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {downloadStatus && (
                        <div className={`${styles.statusMessage} ${downloadStatus.includes('Erreur') ? styles.error : styles.success}`}>
                            {downloadStatus}
                        </div>
                    )}
                </div>

                {loading ? (
                    <p>Loading files...</p>
                    ) : files.length === 0 && folders.length === 0 ? (
                    <p style={{ color: "#999", marginTop: "2rem"}}>No files yet.</p>
                    ) : (
                    /* Files grid */
                    <div className={styles.fileGrid} style={{ opacity: isDownloading || isUploading ? 0.5 : 1 }}>
                        {folders.map((folder) => (
                            <FileCard key={folder.id} id={folder.id} name={folder.name} isFolder={true} onDelete={handleDeleteFolder} onDownload={downloadAndDecrypt} onRename={handleRenameFolder} onMove={handleMoveFolder} />
                        ))}
                        {files.map((file) => (
                            <FileCard key={file.id} id={file.id} name={file.name} onDelete={handleDeleteFile} onDownload={downloadAndDecrypt} onMove={handleMoveFile} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
