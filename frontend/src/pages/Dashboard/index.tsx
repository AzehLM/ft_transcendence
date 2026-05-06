// import { FileCard } from "../../components/FileCard"
// import { ActionButtons } from "../../components/ActionButtons"
import { useState, useEffect } from "react";
// import styles from "./Dashboard.module.css";
import { FilesService, FileItem } from "../../services/files.service";
import { FileGrid } from "../../components/FileGrid";

export default function DashboardPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load files on component mount
    useEffect(() => {
    FilesService.getAllFiles()
        .then(res => setFiles(res.files || []))
        .catch(() => {
        setError("Failed to load files.");
        setFiles([
            { id: "1", name: "January invoice", file_size: 0, created_at: new Date().toISOString() },
            { id: "2", name: "February report", file_size: 0, created_at: new Date().toISOString() },
            { id: "3", name: "March invoice", file_size: 0, created_at: new Date().toISOString() },
            { id: "4", name: "March report and invoice from Vic", file_size: 0, created_at: new Date().toISOString() },
        ]);
        })
        .finally(() => setLoading(false));
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
    <FileGrid
      title="Personal space"
      subtitle="All files"
      files={files}
      loading={loading}
      error={error}
      onDelete={handleDelete}
    />
  );
}