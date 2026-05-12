import { useState, useEffect } from "react";
import { FileItem } from "../../services/files.service";
import { FileGrid } from "../../components/FileGrid";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownloadOrg } from "../../hooks/useE2EEDownloadOrg";
import styles from "../Dashboard/Dashboard.module.css";

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

  const { uploadFile, uploadStatus, uploadProgress, fileInfo } = useE2EEUpload(() => {
    loadFiles();
  }, id);

  const { downloadAndDecryptOrg, downloadStatus } = useE2EEDownloadOrg();

  const handleDownload = (fileId: string) => {
    downloadAndDecryptOrg(fileId, id!);
  };

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
      <div className={styles.uploadContainer} style={{ margin: "20px 5%", marginTop: 0 }}>
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

        {downloadStatus && (
          <div className={`${styles.statusMessage} ${downloadStatus.includes('Erreur') || downloadStatus.includes('❌') ? styles.error : downloadStatus.includes('Succès') ? styles.success : styles.loading}`}>
            {!downloadStatus.includes('Erreur') && !downloadStatus.includes('❌') && !downloadStatus.includes('Succès') && <span className={styles.statusDot}></span>}
            {downloadStatus}
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
      </div>
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
        onDownloadFile={handleDownload}
      />
    </>
  );
}