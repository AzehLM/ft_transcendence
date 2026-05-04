import { FileCard } from "../../components/FileCard"
import { ActionButtons } from "../../components/ActionButtons"
import { useState, useEffect, useCallback } from "react";
import styles from "./Dashboard.module.css";
import { FilesService, FileItem } from "../../services/files.service";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";

export default function DashboardPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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


    const { uploadFile, isUploading, uploadStatus } = useE2EEUpload(() => {
        loadFiles();
    });

    const handleDelete = async (fileName: string) => {
    };

    return (
        <div className={styles.page}>

            <ActionButtons onUploadFile={uploadFile} />

            {/* Main content area */}
            <div className={styles.contentArea}>
                <h1 className={styles.title}>
                    Personal space
                </h1>
                <h2 className={styles.subtitle}>
                    All files
                </h2>

                {error && (
                    <p style={{ color: "#de7356", marginBottom: "16px" }}>
                        {error}
                    </p>
                )}

                {uploadStatus && (
                    <div style={{
                        padding: '12px', marginBottom: '16px', borderRadius: '6px',
                        backgroundColor: uploadStatus.includes('❌') ? '#fee2e2' : '#e0f2fe',
                        color: uploadStatus.includes('❌') ? '#991b1b' : '#075985',
                        fontWeight: 'bold'
                    }}>
                        {uploadStatus}
                    </div>
                )}

                {loading ? (
                    <p>Loading files...</p>
                ) : (
                    /* Files grid */
                    <div className={styles.fileGrid} style={{ opacity: isUploading ? 0.5 : 1 }}>
                        {files.map((file) => (
                            <FileCard key={file.id} name={file.name} isTrash={false} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}