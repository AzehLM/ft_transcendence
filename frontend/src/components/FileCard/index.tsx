import { MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./FileCard.module.css";
import { DeleteConfirmationModal } from "../DeleteConfirmationModal";

interface FileCardProps {
  name: string;
  isTrash?: boolean;
  onDelete?: (name: string) => void;
  onAddToFolder?: (fileName: string, folderName: string) => void;
  onCreateFolder?: (fileName: string, folderName: string) => void;
}

export function FileCard({ name, isTrash = false, onDelete, onAddToFolder, onCreateFolder }: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      onAddToFolder?.(name, folderName);
      setShowMenu(false);
    }
  };

  const handleCreateFolder = () => {
    const folderName = prompt("Enter new folder name:");
    if (folderName) {
      onCreateFolder?.(name, folderName);
      setShowMenu(false);
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(name);
  };

  return (
    <>
      <div className={styles.fileCard}>
        <div className={styles.fileCard__background} />
        <div className={styles.fileCard__blur} />
        <div className={styles.fileCard__name}>
          {name}
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
                onClick={handleCreateFolder}
                className={styles.fileCard__menu__item}
              >
                Create Folder
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
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        fileName={name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isTrash={isTrash}
      />
    </>
  );
}