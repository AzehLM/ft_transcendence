import { MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";
import { useDecryptFilenameOrg } from "../../hooks/useDecryptFilenameOrg";

interface FileCardProps {
  id: string;
  name: string;
  isTrash?: boolean;
  onDelete?: (id: string) => void;
  onAddToFolder?: (fileName: string, folderName: string) => void; // maybe need to change to id
  onDownload?: (id: string) => void;
  orgId?: string;
}

export function FileCard({ id, name, isTrash = false, onDelete, onAddToFolder, onDownload, orgId }: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { decryptedName: personalName, loading: personalLoading } = useDecryptFilename(id);
  const { decryptedName: orgName, loading: orgLoading } = useDecryptFilenameOrg(id, orgId || "");

  const loading = orgId ? orgLoading : personalLoading;
  const displayName = orgId ? (loading ? "..." : orgName || name) : (loading ? "..." : personalName || name);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAddToFolder = () => {
    const folderName = prompt("Enter existing folder name:");
    if (folderName) {
      onAddToFolder?.(displayName, folderName);
      setShowMenu(false);
    }
  };

  const handleDownload = () => {
    onDownload?.(id);
    setShowMenu(false);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(id);
  };

  return (
    <>
      <div className={styles.fileCard}>
        <div className={styles.fileCard__background} />
        <div className={styles.fileCard__blur} />
        <div className={styles.fileCard__name}>
          {displayName}
        </div>
        <div className={styles.fileCard__menu} ref={menuRef}>
          <button
            onClick={handleMenuClick}
            className={styles.fileCard__menu__button}
            aria-label="File options"
          >
            <MoreVertical className={styles.fileCard__menu__button__icon} strokeWidth={2} />
          </button>
          {showMenu && (
            <div className={styles.fileCard__menu__dropdown}>
              <button
                onClick={handleAddToFolder}
                className={styles.fileCard__menu__item}
              >
                Add to Folder
              </button>
              <button
                onClick={handleDownload}
                className={styles.fileCard__menu__item}
              >
                Download
              </button>
              <button
                onClick={handleDelete}
                className={`${styles.fileCard__menu__item} ${styles["fileCard__menu__item--delete"]}`}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        fileName={displayName}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isTrash={isTrash}
      />
    </>
  );
}