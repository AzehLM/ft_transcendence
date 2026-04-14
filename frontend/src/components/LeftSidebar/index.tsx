import { ChevronDown, Folder, Trash2, Files, Package } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "./LeftSidebar.module.css";
import { FilesService, FolderItem } from "../../services/files.service";

export function LeftSidebar({ foldersExpanded, setFoldersExpanded }: { foldersExpanded: boolean; setFoldersExpanded: (expanded: boolean) => void }) {
  const location = useLocation();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load folders on component mount
  useEffect(() => {
    const loadFolders = async () => {
      try {
        setLoading(true);
        const response = await FilesService.getAllFiles();
        setFolders(response.folders || []);
      } catch (err) {
        console.error("Failed to load folders:", err);
        setFolders([]);
      } finally {
        setLoading(false);
      }
    };

    loadFolders();
  }, []);

  return (
    <div className={styles.sidebar}>
      <div>
        <Link to="/" className={styles.sidebar__logo}>
          <Package className="size-9" />
          ft_box
        </Link>
      </div>

      <Link
        to="/dashboard"
        className={`${styles.sidebar__button} ${location.pathname === '/dashboard' ? styles["sidebar__button--active"] : ''}`}
        style={{ top: '130px', textDecoration: 'none' }}
      >
        <Files className={styles.sidebar__button__icon} />
        <span className={styles.sidebar__button__label}>
          All files
        </span>
      </Link>

      <button
        onClick={() => setFoldersExpanded(!foldersExpanded)}
        className={styles.sidebar__button}
        style={{ top: '190px' }}
      >
        <ChevronDown className={`${styles.sidebar__chevron} ${foldersExpanded ? '' : styles.sidebar__chevron__rotated}`} />
        <span className={styles.sidebar__button__label}>
          Folders
        </span>
      </button>

      {/* Dynamically render folder items */}
      {foldersExpanded && folders.length > 0 && !loading && (
        <>
          {folders.map((folder, index) => (
            <button
              key={folder.id}
              className={styles.sidebar__folder}
              style={{ top: `${250 + index * 60}px` }}
            >
              <Folder className={styles.sidebar__folder__icon} />
              <span className={styles.sidebar__button__label}>
                {folder.name}
              </span>
            </button>
          ))}
        </>
      )}

      <Link
        to="/trash"
        className={`${styles.sidebar__trash__button} ${location.pathname === '/trash' ? styles["sidebar__trash__button--active"] : ''}`}
        style={{ top: foldersExpanded && folders.length > 0 ? `${250 + folders.length * 60}px` : '250px', textDecoration: 'none' }}
      >
        <Trash2 className={styles.sidebar__trash__button__icon} />
        <span className={styles.sidebar__button__label}>
          Trash
        </span>
      </Link>
    </div>
  );
}
