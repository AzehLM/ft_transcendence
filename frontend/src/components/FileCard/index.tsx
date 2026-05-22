import { File, Download, Move, Trash2, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { MoveModal } from "../MoveModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";

interface FileCardProps {
  id: string;
  name: string;
  fileSize: number;
  orgId?: string;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onMove?: (id: string, newParentId: string | null) => Promise<void>;
}

export function FileCard({ id, name, fileSize, orgId, onDelete, onDownload, onMove }: FileCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const { decryptedName, loading } = useDecryptFilename(id, orgId);
  const displayName = loading ? "..." : (decryptedName || name);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);

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


  return (
    <>
      <div className={styles.row}>
        <div className={styles.left}>
          <File className={styles.icon} />
          <span className={styles.name}>{displayName}</span>
        </div>
        <div className={styles.right}>
          <span className={styles.size}>{formatSize(fileSize)}</span>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => onDownload?.(id)} title="Download">
              <Download size={16} />
            </button>
            <button className={styles.actionBtn} onClick={() => setShowMoveModal(true)} title="Move">
              <Move size={16} />
            </button>
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => setShowDeleteModal(true)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>

            <div className={styles.menuWrapper} ref={menuRef}>
            <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
                <MoreVertical size={16} />
            </button>
            {showMenu && (
                <div className={styles.dropdown}>
                <button onClick={() => onDownload?.(id)}>
                    <Download size={14} /> Download
                </button>
                <button onClick={() => setShowMoveModal(true)}>
                    <Move size={14} /> Move
                </button>
                <button className={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
                    <Trash2 size={14} /> Delete
                </button>
                </div>
            )}
            </div>

        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        fileName={displayName}
        onConfirm={() => { onDelete?.(id); setShowDeleteModal(false); }}
        onCancel={() => setShowDeleteModal(false)}
        isDeleteFile={true}
      />

      {showMoveModal && (
        <MoveModal
          isOpen={showMoveModal}
          fileName={displayName}
          orgId={orgId}
          onConfirm={async (newParentId) => {
            await onMove?.(id, newParentId);
            setShowMoveModal(false);
          }}
          onCancel={() => setShowMoveModal(false)}
        />
      )}
    </>
  );
}