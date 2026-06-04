import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Download,
  Move,
  Trash2,
  MoreVertical,
  Eye
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { MoveModal } from "../MoveModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";
import { useKeyCheck } from "../../hooks/useKeyCheck";
import { FilePreviewModal } from "../FilePreviewModal";

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

const getFileIconAndColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
        return {
            Icon: FileImage,
            color: "#ec4899",
            bg: "rgba(236, 72, 153, 0.1)"
        };
    }

    if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'mpeg'].includes(ext)) {
        return {
            Icon: FileVideo,
            color: "#8b5cf6",
            bg: "rgba(139, 92, 246, 0.1)"
        };
    }
    if (['pdf'].includes(ext)) {
        return {
            Icon: FileText,
            color: "#ef4444",
            bg: "rgba(239, 68, 68, 0.1)"
        };
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
        return {
            Icon: FileSpreadsheet,
            color: "#10b981",
            bg: "rgba(16, 185, 129, 0.1)"
        };
    }

    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return {
            Icon: FileArchive,
            color: "#f59e0b",
            bg: "rgba(245, 158, 11, 0.1)"
        };
    }
    if (['json', 'js', 'ts', 'tsx', 'html', 'css', 'go', 'sh', 'yaml', 'yml'].includes(ext)) {
        return {
            Icon: FileCode,
            color: "#06b6d4",
            bg: "rgba(6, 182, 212, 0.1)"
        };
    }
    if (['txt', 'md', 'rtf'].includes(ext)) {
        return {
            Icon: FileText,
            color: "#3b82f6",
            bg: "rgba(59, 130, 246, 0.1)"
        };
    }

    return {
        Icon: File,
        color: "#865142",
        bg: "rgba(134, 81, 66, 0.1)"
    };
};

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

  const { Icon, color, bg } = getFileIconAndColor(displayName);

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
          <span className={styles.size}>{formatSize(fileSize)}</span>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => handlePreviewClick()} title="Preview">
              <Eye size={16} />
            </button>
            <button className={styles.actionBtn} onClick={() => handleDownloadClick()} title="Download">
              <Download size={16} />
            </button>
            {(!orgId || (orgId && role === "admin") || (orgId && owner_user_id === user_id)) && (
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
              {(!orgId || (orgId && role === "admin") || (orgId && owner_user_id === user_id)) && (
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
        />
      )}
    </>
  );
}
