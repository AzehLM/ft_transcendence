import { FilePlus, UploadCloud, FolderPlus } from "lucide-react";
import styles from "./ActionButtons.module.css";

export function ActionButtons() {
  return (
    <div className={styles.container}>
      {/* Create files button */}
      <button className={`${styles.button} ${styles["button--create-files"]}`}>
        <FilePlus className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Create file
        </span>
      </button>

      {/* Create folder button */}
      <button className={`${styles.button} ${styles["button--create-folder"]}`}>
        <FolderPlus className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Create folder
        </span>
      </button>

      {/* Upload button */}
      <button className={`${styles.button} ${styles["button--upload"]}`}>
        <UploadCloud className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Upload
        </span>
      </button>
    </div>
  );
}