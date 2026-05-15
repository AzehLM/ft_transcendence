import { useRef } from "react";
import { UploadCloud, FolderPlus } from "lucide-react";
import styles from "./ActionButtons.module.css";

interface ActionButtonsProps {
  onUploadFile?: (file: File) => void;
  onCreateFolder?: () => void;
}

export function ActionButtons({ onUploadFile, onCreateFolder }: ActionButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onUploadFile) {
      Array.from(files).forEach((file) => onUploadFile(file));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.container}>

      {/* Create folder button */}
      <button
        className={`${styles.button} ${styles["button--create-folder"]}`}
        onClick={onCreateFolder}
      >
        <FolderPlus className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Create folder
        </span>
      </button>

      {/* Upload button */}
      <button
        className={`${styles.button} ${styles["button--upload"]}`}
        onClick={handleUploadClick}
      >
        <UploadCloud className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Upload
        </span>
      </button>

      {/*
      */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}