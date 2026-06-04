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
  hiding?: boolean;
}

interface UploadStatusProps {
  uploads: Upload[];
  mainError?: string | null;
}

export function UploadStatus({ uploads, mainError }: UploadStatusProps) {
  return (
    <>
      {mainError && (
        <div className={`${styles.statusMessage} ${styles.error}`}>
          {mainError}
        </div>
      )}

      {uploads.map(upload => (
        <div key={upload.id} style={{ marginBottom: "20px" }} className={`${styles.uploadWrapper} ${upload.hiding ? styles.hide : ""}`}>
          <div className={`${styles.statusMessage} ${upload.status.toLowerCase().includes("error") ? styles.error : upload.status.toLowerCase().includes("success") ? styles.success : styles.loading} ${upload.hiding ? styles.hide : ""}`}>
            {!upload.status.toLowerCase().includes("error") && !upload.status.toLowerCase().includes("success") && <span className={styles.statusDot}></span>}
            {upload.status}
          </div>

          <div className={`${styles.fileInfoCard} ${upload.hiding ? styles.hide : ""}`}>
            <div className={styles.fileName}>{upload.fileInfo.name}</div>
            <div className={styles.fileDetails}>
              <span><strong>Type:</strong> {upload.fileInfo.type}</span>
              <span><strong>Size:</strong> {upload.fileInfo.size}</span>
            </div>
          </div>

          {upload.progress && (
            <div className={`${styles.progressContainer} ${upload.hiding ? styles.hide : ""}`}>
              <div className={styles.progressHeader}>
                <div className={styles.progressTitleContainer}>
                  <div className={styles.progressTitle}>Encryption & Upload</div>
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
                  <div className={styles.metricLabel}>Speed</div>
                  <div className={styles.metricValue}>{(upload.progress.speed / (1024 * 1024)).toFixed(2)} MB/s</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Progression</div>
                  <div className={styles.metricValue}>
                    {(upload.progress.uploadedBytes / (1024 * 1024)).toFixed(1)} / {(upload.progress.totalBytes / (1024 * 1024)).toFixed(0)} MB
                  </div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Time remaining</div>
                  <div className={styles.metricValue}>{Math.round(upload.progress.remainingTime)}s</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}