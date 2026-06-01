import { Link } from "react-router-dom";
import styles from "./Sidebar.module.css";
import { LockLogo } from "../LockLogo/LockLogo";

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.sidebar}>
      <Link to="/dashboard" className={styles.sidebar__logo}>
        <LockLogo size={36} />
        <div className={styles.logoText}>
          <span className={styles.logoName}>Ostrom</span>
          <span className={styles.logoSubtitle}>Cloud Storage</span>
        </div>
      </Link>
      <div className={styles.sidebar__links}>
        {children}
      </div>
    </div>
  );
}