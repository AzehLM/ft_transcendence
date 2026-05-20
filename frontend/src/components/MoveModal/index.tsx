import { useState, useEffect } from "react";
import styles from "../ConfirmationModal/ConfirmationModal.module.css"

interface FolderItem {
  id: string;
  name: string;
}

interface MoveFolderModalProps {
  isOpen: boolean;
  fileName: string;
  folders: FolderItem[];
  onConfirm: (folderId: string) => void;
  onCancel: () => void;
}

export function MoveModal({ isOpen, fileName, folders, onConfirm, onCancel }: MoveFolderModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState("");

  if (!isOpen) return null;
  useEffect(() => {
      console.log(folders);
  }
)

  return (
    <>
      <div className={styles.modal__overlay} onClick={onCancel} />
      <div className={styles.modal}>
        <h3 className={styles.modal__title}>Move "{fileName}"</h3>
        <p className={styles.modal__message}>Select destination folder :</p>
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className={styles.select} // to do
        >
          <option value="">Root</option>
          {folders.map(folder => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <div className={styles.modal__actions}>
          <button onClick={onCancel} className={`${styles.modal__button} ${styles["modal__button--cancel"]}`} >Cancel</button>
          <button onClick={() => onConfirm(selectedFolderId)} className={`${styles.modal__button} ${styles["modal__button--delete"]}`}>Move</button>
        </div>
      </div>
    </>
  );
}