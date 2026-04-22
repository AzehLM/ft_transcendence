import { FileCard } from "../../components/FileCard"
import { useState, useEffect } from "react";
import styles from "../Dashboard/Dashboard.module.css";
import { FilesService, FileItem } from "../../services/files.service";

export default function TrashPage() {
    const [trashedFiles, setTrashedFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load trash files on component mount
    useEffect(() => {
        const loadTrashFiles = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await FilesService.getTrashFiles();
                setTrashedFiles(response.files || []);
            } catch (err) {
                console.error("Failed to load trash files:", err);
                setError("Failed to load trash files. Using local data for now.");
                // Fallback to local data during development
                setTrashedFiles([
                    { id: "1", name: "Deleted document", file_size: 0, created_at: new Date().toISOString() },
                    { id: "2", name: "Old report", file_size: 0, created_at: new Date().toISOString() },
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadTrashFiles();
    }, []);

    const handlePermanentDelete = async (fileName: string) => {
        try {
            const file = trashedFiles.find(f => f.name === fileName);
            if (file) {
                // Call API to permanently delete file
                await FilesService.permanentlyDeleteFile(file.id);
                // Update local state
                setTrashedFiles(trashedFiles.filter(f => f.name !== fileName));
            }
        } catch (err) {
            console.error("Failed to permanently delete file:", err);
            setError("Failed to delete file");
            // Fallback to local delete
            setTrashedFiles(trashedFiles.filter(file => file.name !== fileName));
        }
    };

    return (
        <div className={styles.page}>

            <div className={styles.contentAreaNoButtons}>
                <h1 className={styles.title}>
                    Trash
                </h1>
                <h2 className={styles.subtitle}>
                    Deleted items
                </h2>

                {error && (
                    <p style={{ color: "#de7356", marginBottom: "16px" }}>
                        {error}
                    </p>
                )}

                {loading ? (
                    <p>Loading trash files...</p>
                ) : (
                    /* Files grid */
                    <div className={styles.fileGrid}>
                        {trashedFiles.map((file) => (
                            <FileCard key={file.id} name={file.name} isTrash={true} onDelete={handlePermanentDelete} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
