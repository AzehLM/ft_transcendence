import styles from "./UploadStatus.module.css";

interface UploadProgress {
  percentage: number;
  speed: number;
  uploadedBytes: number;
  totalBytes: number;
  remainingTime: number;
}

interface Upload {
  id: string;
  status: string;
  isUploading: boolean;
  fileInfo: { name: string; type: string; size: string };
  progress?: UploadProgress | null;
}

interface UploadStatusProps {
  uploads: Upload[];
  downloadStatus?: string | null;
  hideDownloadMessage?: boolean;
  error?: string | null;
  success?: string | null;
  hideMessage?: boolean;
}

export function UploadStatus({ uploads, downloadStatus, hideDownloadMessage, error, success, hideMessage }: UploadStatusProps) {
  return (
    <>
      {error && (
        <div className={`${styles.statusMessage} ${styles.error} ${hideMessage ? styles.hide : ""}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`${styles.statusMessage} ${success.includes("Error") ? styles.error : styles.success} ${hideMessage ? styles.hide : ""}`}>
          {success}
        </div>
      )}

      {uploads.map(upload => (
        <div key={upload.id} style={{ marginBottom: "20px" }}>
          <div className={`${styles.statusMessage} ${upload.status.includes("Error") ? styles.error : styles.loading}`}>
            {!upload.status.includes("Error") && <span className={styles.statusDot}></span>}
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
                  <div className={styles.progressFill} style={{ width: `${upload.progress.percentage}%` }} />
                </div>
              </div>
              <div className={styles.progressMetrics}>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Vitesse</div>
                  <div className={styles.metricValue}>{(upload.progress.speed / (1024 * 1024)).toFixed(2)} MB/s</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Progression</div>
                  <div className={styles.metricValue}>
                    {(upload.progress.uploadedBytes / (1024 * 1024)).toFixed(1)} / {(upload.progress.totalBytes / (1024 * 1024)).toFixed(0)} MB
                  </div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Temps restant</div>
                  <div className={styles.metricValue}>{Math.round(upload.progress.remainingTime)}s</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {downloadStatus && (
        <div className={`${styles.statusMessage} ${downloadStatus.includes("Erreur") ? styles.error : styles.success} ${hideDownloadMessage ? styles.hide : ""}`}>
          {downloadStatus}
        </div>
      )}
    </>
  );
}