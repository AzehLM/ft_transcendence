import { useState, useEffect } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import styles from "../ConfirmationModal/ConfirmationModal.module.css";
import moveStyles from "./MoveModal.module.css";
import { FilesService, FolderItem } from "../../services/files.service";

interface MoveFolderModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: (folderId: string | null) => void;
  onCancel: () => void;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export function MoveModal({ isOpen, fileName, onConfirm, onCancel }: MoveFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFolder(null);
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: "Root" }]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    loadFolders(currentFolderId);
  }, [currentFolderId, isOpen]);

  const loadFolders = async (folderId: string | null) => {
    try {
      setLoading(true);
      setError(null);
      const response = folderId
        ? await FilesService.getFolderContents(folderId)
        : await FilesService.getAllFiles();
      setFolders(response.folders || []);
    } catch {
      setError("Failed to load folders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setSelectedFolder(null);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
    setCurrentFolderId(item.id);
    setSelectedFolder(null);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modal__overlay} onClick={onCancel} />
      <div className={styles.modal}>
        <h3 className={styles.modal__title}>Move "{fileName}"</h3>

        <div className={moveStyles.breadcrumbs}>
          {breadcrumbs.map((item, index) => (
            <span key={index} className={moveStyles.breadcrumbItem}>
              {index > 0 && <ChevronRight size={14} className={moveStyles.breadcrumbSeparator} />}
              <button
                className={`${moveStyles.breadcrumbBtn} ${index === breadcrumbs.length - 1 ? moveStyles.breadcrumbActive : ""}`}
                onClick={() => handleBreadcrumbClick(item, index)}
              >
                {item.name}
              </button>
            </span>
          ))}
        </div>

        <div className={moveStyles.folderList}>
          {loading ? (
            <p className={moveStyles.loadingMsg}>Loading...</p>
          ) : error ? (
            <p className={moveStyles.errorMsg}>{error}</p>
          ) : folders.length === 0 ? (
            <p className={moveStyles.emptyMsg}>No folders here.</p>
          ) : (
            folders.map((folder) => (
              <div
                key={folder.id}
                className={`${moveStyles.folderRow} ${selectedFolder === folder.id ? moveStyles.selected : ""}`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <div className={moveStyles.folderLeft}>
                  {selectedFolder === folder.id
                    ? <FolderOpen size={18} className={moveStyles.folderIcon} />
                    : <Folder size={18} className={moveStyles.folderIcon} />
                  }
                  <span className={moveStyles.folderName}>{folder.name}</span>
                </div>
                <button
                  className={moveStyles.enterBtn}
                  onClick={(e) => { e.stopPropagation(); handleEnterFolder(folder); }}
                  title="Open folder"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.modal__actions}>
          <button onClick={onCancel} className={`${styles.modal__button} ${styles["modal__button--cancel"]}`}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedFolder ?? currentFolderId)}
            className={`${styles.modal__button} ${styles["modal__button--delete"]}`}
          >
            Move here
          </button>
        </div>
      </div>
    </>
  );
}