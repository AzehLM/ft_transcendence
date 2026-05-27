import { useRef, useState, useEffect } from "react";
import { UploadCloud, FolderPlus } from "lucide-react";
import styles from "./ActionButtons.module.css";
import { getAcceptAttribute } from "../../services/fileValidation.service";
import { getPublicKeyFromSession } from "../../services/crypto.service";
import { ConfirmationModal } from "../ConfirmationModal";
import { resetKeys } from "../../services/auth.service";
import { fetchWithRefresh } from "../../services/api.service";

interface ActionButtonsProps {
  onUploadFile?: (file: File) => void;
  onCreateFolder?: () => void;
}

export function ActionButtons({ onUploadFile, onCreateFolder }: ActionButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keyMissing, setKeyMissing] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

    useEffect(() => {
    fetchWithRefresh("/api/auth/me")
        .then(res => res.json())
        .then(data => setEmail(data.email));
    }, []);

  const handleUploadClick = async () => {
    const userPublicKey = await getPublicKeyFromSession();
    if (!userPublicKey) {
      setKeyMissing(true)
      return;
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

  const handleResetKeys = async () => {
    setModalError(null);
    if (!password) return;

    const { success, error } = await resetKeys(email, password);
    if (!success) {
      setModalError(error ?? "Error !");
      return;
    }

    setPassword("");
    setKeyMissing(false);
    setModalError(null);
  };

  return (
    <>
        <ConfirmationModal
          isOpen={keyMissing}
          fileName={""}
          onConfirm={handleResetKeys}
          onCancel={() => { setKeyMissing(false); setModalError(null); }}
          isKeyMissing={true}
          inputValue={password}
          onInputChange={setPassword}
          errorMessage={modalError ?? undefined}
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