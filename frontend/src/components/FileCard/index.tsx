import { MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";
import { Folder } from "lucide-react";

interface FileCardProps {
  id: string;
  name: string;
  isFolder?: boolean;
  isTrash?: boolean;
  onDelete?: (id: string) => void;
  onMove?: (fileName: string, folderName: string) => void; // maybe need to change to id
  onDownload?: (id: string) => void;
  orgId?: string;
}

export function FileCard({ id, name, isFolder = false, isTrash = false, onDelete, onMove, onDownload, orgId }: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { decryptedName, loading } = useDecryptFilename(isFolder ? null : id, orgId);

  const displayName = isFolder ? name : (loading ? "..." : (decryptedName || name));
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

  const handleMove = () => {
    const folderName = prompt("Enter existing folder name:");
    if (folderName) {
      onMove?.(displayName, folderName);
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

  if (!isFolder) {
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
                  onClick={handleMove}
                  className={styles.fileCard__menu__item}
                >
                  Move
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
  else {
  if (isFolder) {
  return (
    <>
      <div className={styles.folderCard}>
        <div className={styles.folderCard__background} />
        <Folder className={styles.folderCard__icon} />
        <div className={styles.folderCard__name}>{name}</div>
        <div className={styles.fileCard__menu} ref={menuRef}>
          <button onClick={handleMenuClick} className={styles.fileCard__menu__button}>
            <MoreVertical className={styles.fileCard__menu__button__icon} strokeWidth={2} />
          </button>
          {showMenu && (
            <div className={styles.fileCard__menu__dropdown}>
                <button onClick={handleMove} className={styles.fileCard__menu__item}>
                  Move
                </button>
              <button onClick={handleDelete} className={`${styles.fileCard__menu__item} ${styles["fileCard__menu__item--delete"]}`}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        fileName={name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isTrash={false}
      />
    </>
  );
}
  }
}