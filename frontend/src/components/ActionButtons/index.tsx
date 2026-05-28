import { useRef } from "react";
import { UploadCloud, FolderPlus } from "lucide-react";
import styles from "./ActionButtons.module.css";
import { getAcceptAttribute } from "../../services/fileValidation.service";
import { ConfirmationModal } from "../ConfirmationModal";
import { useKeyCheck } from "../../hooks/useKeyCheck";

interface ActionButtonsProps {
  onUploadFile?: (file: File) => void;
  onCreateFolder?: () => void;
}

export function ActionButtons({ onUploadFile, onCreateFolder }: ActionButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { keyMissing, setKeyMissing, password, 
    setPassword, keyModalError, isResetting, setKeyModalError, 
    checkKeys, handleResetKeys } = useKeyCheck();

  const handleUploadClick = async () => {
    const hasKeys = await checkKeys();
    if (!hasKeys) {
      return
    }
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
    <>
        <ConfirmationModal
          isOpen={keyMissing}
          fileName={""}
          onConfirm={handleResetKeys}
          onCancel={() => { setKeyMissing(false); setKeyModalError(null); }}
          isKeyMissing={true}
          inputValue={password}
          onInputChange={setPassword}
          errorMessage={keyModalError ?? undefined}
          isLoading={isResetting}
        />
    <div className={styles.container}>

      <button
        className={`${styles.button} ${styles["button--create-folder"]}`}
        onClick={onCreateFolder}
      >
        <FolderPlus className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Create folder
        </span>
      </button>

      <button
        className={`${styles.button} ${styles["button--upload"]}`}
        onClick={handleUploadClick}
      >
        <UploadCloud className={styles["button__icon"]} />
        <span className={styles["button__text"]}>
          Upload
        </span>
      </button>

      <input
        type="file"
        multiple
        accept={getAcceptAttribute()}
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
    </>
  );
}