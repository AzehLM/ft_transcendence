import { FileGrid } from "../../components/FileGrid";
import { useState, useEffect } from "react";
import { FilesService, FileItem } from "../../services/files.service";

export default function TrashPage() {
    const [trashedFiles, setTrashedFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load trash files on component mount
    useEffect(() => {
    FilesService.getTrashFiles()
        .then(res => setTrashedFiles(res.files || []))
        .catch(() => {
        setError("Failed to load trash files.");
        })
        .finally(() => setLoading(false));
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
    <FileGrid
      title="Trash"
      subtitle="Deleted items"
      files={trashedFiles}
      loading={loading}
      onDelete={handlePermanentDelete}
      showActionButtons={false}
    />
  );
}
