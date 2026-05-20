import { MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";
import { Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FolderItem } from "../../services/files.service";
import { MoveModal } from "../MoveModal";


interface FileCardProps {
  id: string;
  name: string;
  isFolder?: boolean;
  isTrash?: boolean;
  onDelete?: (id: string) => void;
  onMove?: (id: string, newParentId: string | null) => Promise<void>;
  onDownload?: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  orgId?: string;
  folders?: FolderItem[]; 
}

export function FileCard({ id, name, isFolder = false, isTrash = false, onDelete, onMove, onDownload, onRename, orgId, folders = undefined }: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { decryptedName, loading } = useDecryptFilename(isFolder ? null : id, orgId);
  const navigate = useNavigate();

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

  const handleRename = () => {
    setShowMenu(false);
    setShowRenameConfirm(true);
  };

  const [renameValue, setRenameValue] = useState(name);
  const [showRenameConfirm, setShowRenameConfirm] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleConfirmRename = async () => {
    try {
      if (!renameValue.trim()) {
        setModalError("Invalid name");
        return;
      }

      await onRename?.(id, renameValue);

      setShowRenameConfirm(false);
      setModalError(null);
    } catch (err) {
      setModalError("Failed to rename folder");
    }
  };

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState("");

  const handleMove = () => {
    setShowMenu(false);
    setShowMoveModal(true);
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
          isDeleteFile={true}
        />
        {showMoveModal && (
          <MoveModal
            isOpen={showMoveModal}
            fileName={displayName}
            onConfirm={(folderId) => {
              onMove?.(id, folderId === "" ? null : folderId);
              setShowMoveModal(false);
            }}
            onCancel={() => setShowMoveModal(false)}
          />
        )}
      </>
    );
  }
  else {
  if (isFolder) {
  return (
    <>
      <div className={styles.folderCard} onClick={() => navigate(`/dashboard/folder/${id}`)}>
        <div className={styles.folderCard__background} />
        <Folder className={styles.folderCard__icon} />
        <div className={styles.folderCard__name}>{name}</div>
        <div className={styles.fileCard__menu} ref={menuRef}>
          <button   
            onClick={(e) => {
              handleMenuClick(e);
            }}
            className={styles.fileCard__menu__button}>
            <MoreVertical className={styles.fileCard__menu__button__icon} strokeWidth={2} />
          </button>
          {showMenu && (
            <div className={styles.fileCard__menu__dropdown}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMove();
                  }} 
                  className={styles.fileCard__menu__item}>
                  Move
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename();
                  }} 
                  className={styles.fileCard__menu__item}>
                  Rename
                </button>
              <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}  
                className={`${styles.fileCard__menu__item} ${styles["fileCard__menu__item--delete"]}`}>
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
        isDeleteFolder={true}
      />
      <ConfirmationModal
        isOpen={showRenameConfirm}
        fileName={name}
        onConfirm={handleConfirmRename}
        onCancel={() => { setShowRenameConfirm(false); setModalError(null); }}
        isRenameFolder={true}
        inputValue={renameValue}
        onInputChange={setRenameValue}
        errorMessage={modalError ?? undefined}
      />
      {showMoveModal && (
        <MoveModal
          isOpen={showMoveModal}
          fileName={name}
          onConfirm={(folderId) => {
            onMove?.(id, folderId === "" ? null : folderId);
            setShowMoveModal(false);
          }}
          onCancel={() => setShowMoveModal(false)}
        />
      )}
    </>
  );
}
  }
}