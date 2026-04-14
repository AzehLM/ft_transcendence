import { MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "../styles/components.module.css";
import { DeleteConfirmationModal } from "./deleteconfirmationmodal";

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
        <div className={styles.fileCardBackground} />
        <div className={styles.fileCardBlur} />
        <div className={styles.fileCardName}>
          {name}
        </div>
        <div className={styles.fileCardMenuContainer} ref={menuRef}>
          <button
            onClick={handleMenuClick}
            className={styles.fileCardMenuButton}
            aria-label="File options"
          >
            <MoreVertical className={styles.fileCardMenuIcon} strokeWidth={2} />
          </button>
          {showMenu && (
            <div className={styles.fileCardMenu}>
              <button
                onClick={handleAddToFolder}
                className={styles.fileCardMenuItem}
              >
                Add to Folder
              </button>
              <button
                onClick={handleCreateFolder}
                className={styles.fileCardMenuItem}
              >
                Create Folder
              </button>
              <button
                onClick={handleDelete}
                className={`${styles.fileCardMenuItem} ${styles.fileCardMenuItemDelete}`}
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