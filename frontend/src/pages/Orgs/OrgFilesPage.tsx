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
      const res = await fetchWithRefresh(`/api/storage/${id}/folders/00000000-0000-0000-0000-000000000000/contents`);
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

  const { uploadFile, uploads } = useE2EEUpload(() => {
    loadFiles();
  }, id);
  
  const activeUploads = Object.values(uploads);

  const { downloadAndDecryptOrg, downloadStatus } = useE2EEDownloadOrg();

  const handleDownload = (fileId: string) => {
    downloadAndDecryptOrg(fileId, id!);
  };

  const handleDelete = async (fileId: string) => {
      const response = await fetchWithRefresh(`/api/files/${fileId}`, { method: "DELETE" });
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

  const handleCreateFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    try {
      setError(null);
      await fetchWithRefresh(`/api/folders`, {
        method: "POST",
        body: JSON.stringify({
          name: folderName,
          org_id: id,
        }),
      });
      await loadFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to create folder: ${errorMessage}`);
    }
  };

  return (
    <>
      <div className={styles.uploadContainer} style={{ margin: "20px 5%", marginTop: 0 }}>
        {error && (
          <div className={`${styles.statusMessage} ${styles.error}`}>
            {error}
          </div>
        )}

        {activeUploads.map(upload => (
            <div key={upload.id} style={{ marginBottom: '20px' }}>
                <div className={`${styles.statusMessage} ${upload.status.includes('Erreur') ? styles.error : styles.loading}`}>
                    {!upload.status.includes('Erreur') && <span className={styles.statusDot}></span>}
                    {upload.status}
                </div>

                <div className={styles.fileInfoCard}>
                    <div className={styles.fileName}>{upload.fileInfo.name}</div>
                    <div className={styles.fileDetails}>
                        <span><strong>Type:</strong> {upload.fileInfo.type}</span>
                        <span><strong>Taille:</strong> {upload.fileInfo.size}</span>
                    </div>
                </div>

                {upload.progress && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressHeader}>
                            <div className={styles.progressTitleContainer}>
                                <div className={styles.progressTitle}>Chiffrement & Upload</div>
                                <div className={styles.progressSubtitle}>{upload.fileInfo.name}</div>
                            </div>
                            <div className={styles.progressPercentage}>{upload.progress.percentage}%</div>
                        </div>
                        <div className={styles.progressBarContainer}>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${upload.progress.percentage}%` }}
                                />
                            </div>
                        </div>
                        <div className={styles.progressMetrics}>
                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>Vitesse</div>
                                <div className={styles.metricValue}>
                                    {(upload.progress.speed / (1024 * 1024)).toFixed(2)} MB/s
                                </div>
                            </div>
                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>Progression</div>
                                <div className={styles.metricValue}>
                                    {((upload.progress.uploadedBytes) / (1024 * 1024)).toFixed(1)} / {((upload.progress.totalBytes) / (1024 * 1024)).toFixed(0)} MB
                                </div>
                            </div>
                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>Temps restant</div>
                                <div className={styles.metricValue}>
                                    {Math.round(upload.progress.remainingTime)}s
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}

        {downloadStatus && (
           <div className={`${styles.statusMessage} ${downloadStatus.includes('Erreur') ? styles.error : downloadStatus.includes('Succès') ? styles.success : styles.loading}`}>
            {!downloadStatus.includes('Erreur') && !downloadStatus.includes('Succès') && <span className={styles.statusDot}></span>}
            {downloadStatus}
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
        orgId={id}
        showActionButtons={true}
        onUploadFile={uploadFile}
        onCreateFolder={handleCreateFolder}
        onDownloadFile={handleDownload}
      />
    </>
  );
}