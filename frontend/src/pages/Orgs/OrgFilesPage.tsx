import { useState, useEffect } from "react";
import { FileItem } from "../../services/files.service";
import { FileGrid } from "../../components/FileGrid";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";

export default function OrgFilesPage() {
  const { id } = useParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
  fetchWithRefresh(`/api/orgs/${id}`)
    .then(res => res.json())
    .then(data => setOrgName(data.name))
    .catch(() => setOrgName("Unknown"));

    fetchWithRefresh(`/api/orgs/${id}/files`)
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
      .catch(() => {
        setError("Failed to load org files.");
        setFiles([
          { id: "1", name: "Org document", file_size: 0, created_at: new Date().toISOString() },
          { id: "2", name: "Org report", file_size: 0, created_at: new Date().toISOString() },
        ]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async (fileId: string) => {
      const response = await fetchWithRefresh(`/api/orgs/${id}/files/${fileId}`, { method: "DELETE" });
      if (!response.ok) {
        const text = await response.text();
        let message = "Failed to delete file.";
        try {
          if (text) {
            const data = JSON.parse(text);
            message = data.error || data.message || message;
          }
        } catch {}
        setError(message);
        return;
      }
      setFiles(files.filter(f => f.id !== fileId));
  };

  return (
    <FileGrid
      title="Organization files"
      subtitle="All files"
      files={files}
      loading={loading}
      error={error}
      onDelete={handleDelete}
      orgName={orgName}
      showActionButtons={true}
    />
  );
}