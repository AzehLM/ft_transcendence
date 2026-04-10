import { FilePlus, UploadCloud, FolderPlus } from "lucide-react";
import styles from "../styles/components.module.css";

export function ActionButtons() {
  return (
    <div className={styles.actionButtonsContainer}>
      {/* Create files button */}
      <button className={`${styles.actionButton} ${styles.createFilesButton}`}>
        <FilePlus className={styles.actionButtonIcon} />
        <span className={styles.actionButtonText}>
          Create<br />files
        </span>
      </button>

      {/* Create folder button */}
      <button className={`${styles.actionButton} ${styles.createFolderButton}`}>
        <FolderPlus className={styles.actionButtonIcon} />
        <span className={styles.actionButtonText}>
          Create<br />folder
        </span>
      </button>

      {/* Upload button */}
      <button className={`${styles.actionButton} ${styles.uploadButton}`}>
        <UploadCloud className={styles.actionButtonIcon} />
        <span className={styles.actionButtonText}>
          Upload
        </span>
      </button>
    </div>
  );
}