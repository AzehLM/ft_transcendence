import { FileCard } from "../../components/FileCard"
import { ActionButtons } from "../../components/ActionButtons"
import { CreateFolderModal } from "../../components/CreateFolderModal"
import { useState, useEffect, useCallback } from "react";
import styles from "./Dashboard.module.css";
import { FilesService, FileItem } from "../../services/files.service";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownload } from "../../hooks/useE2EEDownload";

export default function DashboardPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await FilesService.getAllFiles();
            setFiles(response.files || []);
        } catch (err) {
            console.error("Failed to load files:", err);
            setError("Failed to load files. Using local data for now.");
            setFiles([
                { id: "1", name: "January invoice", file_size: 0, created_at: new Date().toISOString() },
                { id: "2", name: "February report", file_size: 0, created_at: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);


    const { uploadFile, isUploading, uploadStatus, uploadProgress, fileInfo } = useE2EEUpload(() => {
        loadFiles();
    });

    const { downloadAndDecrypt, downloadStatus, isDownloading } = useE2EEDownload();

    const handleCreateFolderSubmit = async (folderName: string) => {
        await FilesService.createFolder(folderName);

        await loadFiles();
    };

    const handleDelete = async () => {
    };

    return (
        <div className={styles.page}>

            <CreateFolderModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                onSubmit={handleCreateFolderSubmit}
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
                    All files
                </h2>

                <div className={styles.uploadContainer}>
                    {error && (
                        <div className={`${styles.statusMessage} ${styles.error}`}>
                            {error}
                        </div>
                    )}

                    {uploadStatus && (
                        <div className={`${styles.statusMessage} ${uploadStatus.includes('Erreur') ? styles.error : styles.loading}`}>
                            {!uploadStatus.includes('Erreur') && <span className={styles.statusDot}></span>}
                            {uploadStatus}
                        </div>
                    )}

                    {fileInfo && (
                        <div className={styles.fileInfoCard}>
                            <div className={styles.fileName}>{fileInfo.name}</div>
                            <div className={styles.fileDetails}>
                                <span><strong>Type:</strong> {fileInfo.type}</span>
                                <span><strong>Taille:</strong> {fileInfo.size}</span>
                            </div>
                        </div>
                    )}

                    {uploadProgress && (
                        <div className={styles.progressContainer}>
                            <div className={styles.progressHeader}>
                                <div className={styles.progressTitle}>Progression du chiffrement</div>
                                <div className={styles.progressPercentage}>{uploadProgress.percentage}%</div>
                            </div>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${uploadProgress.percentage}%` }}
                                />
                            </div>
                            <div className={styles.progressMetrics}>
                                <div className={styles.metric}>
                                    <div className={styles.metricLabel}>Vitesse</div>
                                    <div className={styles.metricValue}>
                                        {(uploadProgress.speed / (1024 * 1024)).toFixed(2)} MB/s
                                    </div>
                                </div>
                                <div className={styles.metric}>
                                    <div className={styles.metricLabel}>Progression</div>
                                    <div className={styles.metricValue}>
                                        {((uploadProgress.uploadedBytes) / (1024 * 1024)).toFixed(1)} / {((uploadProgress.totalBytes) / (1024 * 1024)).toFixed(0)} MB
                                    </div>
                                </div>
                                <div className={styles.metric}>
                                    <div className={styles.metricLabel}>Temps restant</div>
                                    <div className={styles.metricValue}>
                                        {Math.round(uploadProgress.remainingTime)}s
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {downloadStatus && (
                        <div className={`${styles.statusMessage} ${downloadStatus.includes('Erreur') ? styles.error : styles.success}`}>
                            {downloadStatus}
                        </div>
                    )}
                </div>

                {loading ? (
                    <p>Loading files...</p>
                ) : (
                    /* Files grid */
                    <div className={styles.fileGrid} style={{ opacity: isDownloading || isUploading ? 0.5 : 1 }}>
                        {files.map((file) => (
                            <FileCard key={file.id} id={file.id} name={file.name} isTrash={false} onDelete={handleDelete} onDownload={downloadAndDecrypt} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}