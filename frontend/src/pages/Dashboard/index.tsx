import { FileCard } from "../../components/FileCard"
import { ActionButtons } from "../../components/ActionButtons"
import { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { FilesService, FileItem } from "../../services/files.service";

export default function DashboardPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load files on component mount
    useEffect(() => {
        const loadFiles = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await FilesService.getAllFiles();
                setFiles(response.files || []);
            } catch (err) {
                console.error("Failed to load files:", err);
                setError("Failed to load files. Using local data for now.");
                // Fallback to local data during development
                setFiles([
                    { id: "1", name: "January invoice", file_size: 0, created_at: new Date().toISOString() },
                    { id: "2", name: "February report", file_size: 0, created_at: new Date().toISOString() },
                    { id: "3", name: "March invoice", file_size: 0, created_at: new Date().toISOString() },
                    { id: "4", name: "March report and invoice from Vic", file_size: 0, created_at: new Date().toISOString() },
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadFiles();
    }, []);

    const handleDelete = async (fileName: string) => {
        try {
            const file = files.find(f => f.name === fileName);
            if (file) {
                // Call API to delete file (move to trash)
                await FilesService.deleteFile(file.id);
                // Update local state
                setFiles(files.filter(f => f.name !== fileName));
            }
        } catch (err) {
            console.error("Failed to delete file:", err);
            setError("Failed to delete file");
            // Fallback to local delete
            setFiles(files.filter(file => file.name !== fileName));
        }
    };

    return (
        <div className={styles.page}>

            <ActionButtons />

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

                {loading ? (
                    <p>Loading files...</p>
                ) : (
                    /* Files grid */
                    <div className={styles.fileGrid}>
                        {files.map((file) => (
                            <FileCard key={file.id} name={file.name} isTrash={false} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}