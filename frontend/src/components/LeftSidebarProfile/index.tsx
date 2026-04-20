import { User, Package, HardDrive, Shield, Network } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "./LeftSidebar.module.css";

export function LeftSidebar() {
  // const location = useLocation();
  // const [folders, setFolders] = useState<FolderItem[]>([]);
  // const [loading, setLoading] = useState(true);

  // // Load folders on component mount
  // useEffect(() => {
  //   const loadFolders = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await FilesService.getAllFiles();
  //       setFolders(response.folders || []);
  //     } catch (err) {
  //       console.error("Failed to load folders:", err);
  //       setFolders([]);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadFolders();
  // }, []);

  return (
    <div className={styles.sidebar}>
      <div>
        <Link to="/" className={styles.sidebar__logo}>
          <Package className="size-9" />
          ft_box
        </Link>
      </div>
      <div className={styles.sidebar__links}>
      <Link
        to="/profile"
        className={`${styles.sidebar__button} ${location.pathname === '/profile' ? styles["sidebar__button--active"] : ''}`}
        style={{ textDecoration: 'none' }}
      >
        <User className={styles.sidebar__button__icon} />
        <span className={styles.sidebar__button__label}>
          Profile
        </span>
      </Link>
      <Link
        to="/storage"
        className={`${styles.sidebar__button} ${location.pathname === '/storage' ? styles["sidebar__button--active"] : ''}`}
        style={{ textDecoration: 'none' }}
      >
        <HardDrive className={styles.sidebar__button__icon} />
        <span className={styles.sidebar__button__label}>
          Storage
        </span>
      </Link>
      <Link
        to="/account"
        className={`${styles.sidebar__button} ${location.pathname === '/account' ? styles["sidebar__button--active"] : ''}`}
        style={{ textDecoration: 'none' }}
      >
        <Shield className={styles.sidebar__button__icon} />
        <span className={styles.sidebar__button__label}>
          Account
        </span>
      </Link>
      <Link
        to="/organizations"
        className={`${styles.sidebar__button} ${location.pathname === '/organizations' ? styles["sidebar__button--active"] : ''}`}
        style={{ textDecoration: 'none' }}
      >
        <Network className={styles.sidebar__button__icon} />
        <span className={styles.sidebar__button__label}>
          Organizations
        </span>
      </Link>
      </div>
    </div>
  );
}
