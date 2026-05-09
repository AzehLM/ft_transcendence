import { useState, useEffect } from "react";
import { FileItem } from "../../services/files.service";
import { FileGrid } from "../../components/FileGrid";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";

export default function OrgFilesPage() {
  const { id } = useParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const navigate = useNavigate();

  const loadFiles = async () => {
    try {
      const res = await fetchWithRefresh(`/api/orgs/${id}/files`);
      if (!res.ok) throw new Error("Failed to fetch files.");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError("Failed to load org files.");
    }
  };

  useEffect(() => {
  fetchWithRefresh(`/api/orgs/${id}`)
    .then(res => {
      if (res.status === 404 || res.status === 400) {
        navigate("/404");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch org.");
      return res.json();
    })
    .then(data => setOrgName(data.name))
    .catch(() => setOrgName("Unknown"));

    loadFiles()
      .finally(() => setLoading(false));
  }, [id]);

  const { uploadFile } = useE2EEUpload(() => {
    loadFiles();
  }, id);

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
      setFiles(prev => prev.filter(f => f.id !== fileId));
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
      onUploadFile={uploadFile}
    />
  );
}