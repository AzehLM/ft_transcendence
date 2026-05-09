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
      console.log("test oh zebi");
      const res = await fetchWithRefresh(`/api/orgs/${id}/files`);
      if (!res.ok) throw new Error("Failed to fetch files.");
      console.log("test v2");
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

  const { uploadFile, isUploading, uploadStatus, uploadProgress } = useE2EEUpload(() => {
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
    <>
      {uploadStatus && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "#2a2a2a",
          color: "#fff",
          padding: "16px 20px",
          borderRadius: "8px",
          zIndex: 1000,
          maxWidth: "400px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          <div>{uploadStatus}</div>
          {uploadProgress && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ background: "#444", height: "4px", borderRadius: "2px", marginBottom: "8px" }}>
                <div style={{
                  background: "#4CAF50",
                  height: "100%",
                  width: `${uploadProgress.percentage}%`,
                  borderRadius: "2px",
                  transition: "width 0.3s"
                }} />
              </div>
              <div style={{ fontSize: "12px", color: "#aaa" }}>
                {uploadProgress.percentage}% - {(uploadProgress.speed / (1024 * 1024)).toFixed(1)} MB/s
              </div>
            </div>
          )}
        </div>
      )}
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
    </>
  );
}