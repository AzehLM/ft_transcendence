import { ChevronDown, Folder, Trash2, Files, Package } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import styles from "../styles/components.module.css";

export function LeftSidebar({ foldersExpanded, setFoldersExpanded }: { foldersExpanded: boolean; setFoldersExpanded: (expanded: boolean) => void }) {
  const location = useLocation();
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

      {/* Folder items */}
      {foldersExpanded && (
        <>
          <button className={styles.sidebarFolderItem} style={{ top: '250px' }}>
            <Folder className={styles.sidebarFolderIcon} />
            <span className={styles.sidebarButtonLabel}>
              Invoices
            </span>
          </button>

          <button className={styles.sidebarFolderItem} style={{ top: '310px' }}>
            <Folder className={styles.sidebarFolderIcon} />
            <span className={styles.sidebarButtonLabel}>
              Reports
            </span>
          </button>
        </>
      )}


      <Link to="/trash" className={`${styles.sidebarTrashButton} ${location.pathname === '/trash' ? styles.sidebarTrashButtonActive : ''}`} style={{ top: foldersExpanded ? '370px' : '250px', textDecoration: 'none' }}>
        <Trash2 className={styles.sidebarTrashIcon} />
        <span className={styles.sidebarButtonLabel}>
          Trash
        </span>
      </Link>
    </div>
  );
}