import { useState, useEffect, useRef } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { MoveModal } from "../MoveModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";
import { useKeyCheck } from "../../hooks/useKeyCheck";
import { FilePreviewModal } from "../FilePreviewModal";
import { formatFileSize, getDecryptedSize } from "../../services/fileValidation.service";
import { Download, Move, Trash2, MoreVertical, Eye } from "lucide-react";
import { getFileVisual } from "../../config/fileIcon";

interface FileCardProps {
  id: string;
  name: string;
  fileSize: number;
  orgId?: string;
  owner_user_id?: string;
  role?: string;
  user_id?: string;
  onDelete?: (id: string, name:string ) => void;
  onDownload?: (id: string) => void;
  onMove?: (id: string, newParentId: string | null, name: string) => Promise<void>;
}

export function FileCard({ id, name, fileSize, orgId, owner_user_id, role, user_id, onDelete, onDownload, onMove }: FileCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const { decryptedName, loading } = useDecryptFilename(name, orgId);
  const displayName = loading ? "..." : (decryptedName || name);

  const { keyMissing, setKeyMissing, password,
    setPassword, keyModalError, isResetting, setKeyModalError,
    checkKeys, handleResetKeys } = useKeyCheck();

  const handleDownloadClick = async () => {
    const hasKeys = await checkKeys();
    if (!hasKeys) {
      return;
    }
    onDownload?.(id)
  }

  const handlePreviewClick = async () => {
    const hasKeys = await checkKeys();
    if (!hasKeys) {
      return;
    }
    setShowPreviewModal(true);
  }

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

  const { Icon, color, bg } = getFileVisual(displayName);

  return (
    <>
      <div className={styles.row}>
        <div className={styles.left}>
          <div style={{
              backgroundColor: bg,
              color: color,
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px",
              flexShrink: 0
          }}>
              <Icon size={18} />
          </div>
          <span className={styles.name}>{displayName}</span>
        </div>
        <div className={styles.right}>
          <span className={styles.size}>{formatFileSize(getDecryptedSize(fileSize))}</span>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => handlePreviewClick()} title="Preview">
              <Eye size={16} />
            </button>
            <button className={styles.actionBtn} onClick={() => handleDownloadClick()} title="Download">
              <Download size={16} />
            </button>
            {(!orgId || (orgId && (role === "admin" || role === "owner")) || (orgId && owner_user_id === user_id)) && (
              <>
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
              </>
            )}
          </div>
          <div className={styles.menuWrapper} ref={menuRef}>
            <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className={styles.dropdown}>
                <button onClick={() => { handlePreviewClick(); setShowMenu(false); }}>
                  <Eye size={14} /> Preview
                </button>
                <button onClick={() => { handleDownloadClick(); setShowMenu(false); }}>
                  <Download size={14} /> Download
                </button>
              {(!orgId || (orgId && (role === "admin" || role === "owner")) || (orgId && owner_user_id === user_id)) && (
                <>
                <button onClick={() => { setShowMoveModal(true); setShowMenu(false); }}>
                  <Move size={14} /> Move
                </button>
                <button className={styles.deleteBtn} onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}>
                  <Trash2 size={14} /> Delete
                </button>
                </>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
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
      <ConfirmationModal
        isOpen={showDeleteModal}
        fileName={displayName}
        onConfirm={() => { onDelete?.(id, displayName); setShowDeleteModal(false); }}
        onCancel={() => setShowDeleteModal(false)}
        isDeleteFile={true}
      />

      {showMoveModal && (
        <MoveModal
          isOpen={showMoveModal}
          fileName={displayName}
          orgId={orgId}
          onConfirm={async (newParentId) => {
            await onMove?.(id, newParentId, displayName);
            setShowMoveModal(false);
          }}
          onCancel={() => setShowMoveModal(false)}
        />
      )}

      {showPreviewModal && (
        <FilePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          fileId={id}
          fileName={displayName}
          fileSize={fileSize}
          orgId={orgId}
          onDownload={() => handleDownloadClick()}
        />
      )}
    </>
  );
}
