import { ChevronDown, Folder, Trash2, Files, Package } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "../styles/components.module.css";
import { FilesService, FolderItem } from "../services/files.service";

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
        <Link to="/" className={styles.sidebarLogo}>
          <Package className="size-9" />
          ft_box
        </Link>
      </div>


      <Link to="/dashboard" className={`${styles.sidebarSection} ${location.pathname === '/dashboard' ? styles.sidebarSectionActive : ''}`} style={{ top: '130px', textDecoration: 'none' }}>
        <Files className={styles.sidebarIcon} />
        <span className={styles.sidebarButtonLabel}>
          All files
        </span>
      </Link>

        <button
          onClick={() => setFoldersExpanded(!foldersExpanded)}
          className={styles.sidebarFoldersButton}
          style={{ top: '190px' }}
        >
          <ChevronDown className={`${styles.sidebarChevron} ${foldersExpanded ? '' : styles.sidebarChevronRotated}`} />
          <span className={styles.sidebarButtonLabel}>
            Folders
          </span>
        </button>

      {/* Dynamically render folder items */}
      {foldersExpanded && folders.length > 0 && !loading && (
        <>
          {folders.map((folder, index) => (
            <button
              key={folder.id}
              className={styles.sidebarFolderItem}
              style={{ top: `${250 + index * 60}px` }}
            >
              <Folder className={styles.sidebarFolderIcon} />
              <span className={styles.sidebarButtonLabel}>
                {folder.name}
              </span>
            </button>
          ))}
        </>
      )}


      <Link to="/trash" className={`${styles.sidebarTrashButton} ${location.pathname === '/trash' ? styles.sidebarTrashButtonActive : ''}`} style={{ top: foldersExpanded && folders.length > 0 ? `${250 + folders.length * 60}px` : '250px', textDecoration: 'none' }}>
        <Trash2 className={styles.sidebarTrashIcon} />
        <span className={styles.sidebarButtonLabel}>
          Trash
        </span>
      </Link>
    </div>
  );
}