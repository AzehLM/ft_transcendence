import { Folder, MoreVertical, Pencil, Move, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import styles from "./FolderCard.module.css";
import { ConfirmationModal } from "../ConfirmationModal";
import { MoveModal } from "../MoveModal";
import { useNavigate } from "react-router-dom";
import { folderSchema } from "../../schemas/folder.schema";

interface FolderProps {
  id: string;
  name: string;
  createdAt: string;
  orgId?: string;
  owner_user_id?: string;
  role?: string;
  user_id?: string;
  onDelete?: (id: string, name: string) => void;
  onRename?: (id: string, newName: string, prevName: string) => Promise<void>;
  onMove?: (id: string, newParentId: string | null, name: string) => Promise<void>;
}

export function FolderCard({ id, name, createdAt, orgId, owner_user_id, role, user_id, onDelete, onRename, onMove }: FolderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });

  const handleEnterFolder = () => {
    if (orgId) {
      navigate(`/orgs/${orgId}/folder/${id}`);
    } else {
      navigate(`/dashboard/folder/${id}`);
    }
  };

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


    const handleConfirmDelete = () => {
        setShowDeleteModal(false);
        onDelete?.(id, name);
    };

    const handleConfirmRename = async () => {
    setRenameError(null);

    const result = folderSchema.safeParse({ name: renameValue });
    if (!result.success) {
      setRenameError(result.error.issues[0].message)
      return ;
    }

    try {
        await onRename?.(id, result.data.name, name);

        setShowRenameModal(false);
        setRenameError(null);
    } catch (err) {
        setRenameError("Failed to rename folder");
    }
    };

  return (
    <>
        <div className={styles.row} onClick={handleEnterFolder}>
        <div style={{
            backgroundColor: "rgba(213, 79, 42, 0.08)",
            color: "#d54f2a",
            padding: "6px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "10px",
            flexShrink: 0
        }}>
            <Folder size={18} fill="rgba(213, 79, 42, 0.2)" />
        </div>

        <div className={styles.info}>
            <span className={styles.name}>{name}</span>
            <span className={styles.date}>{date}</span>
        </div>
        {(!orgId || (orgId && role === "admin") || (orgId && owner_user_id === user_id)) && (
          <div className={styles.menuWrapper} ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={16} />
              </button>
              {showMenu && (
              <div className={styles.dropdown}>
                  <button onClick={() => { setShowRenameModal(true); setShowMenu(false); }}>
                  <Pencil size={14} /> Rename
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
        )}
        </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        fileName={name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleteFolder={true}
      />

      <ConfirmationModal
        isOpen={showRenameModal}
        fileName={name}
        onConfirm={handleConfirmRename}
        onCancel={() => { setShowRenameModal(false); setRenameError(null); }}
        isRenameFolder={true}
        inputValue={renameValue}
        onInputChange={setRenameValue}
        errorMessage={renameError ?? undefined}
      />

      {showMoveModal && (
        <MoveModal
          isOpen={showMoveModal}
          fileName={name}
          orgId={orgId}
          onConfirm={(folderId) => {
            onMove?.(id, folderId === "" ? null : folderId, name);
            setShowMoveModal(false);
          }}
          onCancel={() => setShowMoveModal(false)}
        />
      )}
    </>
  );
}
