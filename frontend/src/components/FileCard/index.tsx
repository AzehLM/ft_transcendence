import { File, Download, Move, Trash2, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import styles from "./FileCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { MoveModal } from "../MoveModal";
import { useDecryptFilename } from "../../hooks/useDecryptFilename";
import { getPrivateKeyFromSession } from "../../services/crypto.service";
import { resetKeys } from "../../services/auth.service";
import { fetchWithRefresh } from "../../services/api.service";

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
  const [keyMissing, setKeyMissing] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);


  useEffect(() => {
  fetchWithRefresh("/api/auth/me")
      .then(res => res.json())
      .then(data => setEmail(data.email));
  }, []);


  const handleResetKeys = async () => {
    setModalError(null);
    if (!password) return;

    const { success, error } = await resetKeys(email, password);
    if (!success) {
      setModalError(error ?? "Error !");
      return;
    }

    setPassword("");
    setKeyMissing(false);
    setModalError(null);
  };

  const handleDownloadClick = async () => {
    const userPrivateKey = await getPrivateKeyFromSession();
    if (!userPrivateKey) {
      setKeyMissing(true)
      return;
    }
    console.log("private key found")
    onDownload?.(id)
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
            <button className={styles.actionBtn} onClick={() => handleDownloadClick()} title="Download">
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
                <button onClick={() => { handleDownloadClick(); setShowMenu(false); }}>
                  <Download size={14} /> Download
                </button>
                <button onClick={() => { setShowMoveModal(true); setShowMenu(false); }}>
                  <Move size={14} /> Move
                </button>
                <button className={styles.deleteBtn} onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      <ConfirmationModal
        isOpen={keyMissing}
        fileName={""}
        onConfirm={handleResetKeys}
        onCancel={() => { setKeyMissing(false); setModalError(null); }}
        isKeyMissing={true}
        inputValue={password}
        onInputChange={setPassword}
        errorMessage={modalError ?? undefined}
      />
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