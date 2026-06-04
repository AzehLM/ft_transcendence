import { Link } from "react-router-dom";
import styles from "./Sidebar.module.css";

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.sidebar}>
      <Link to="/dashboard" className={styles.sidebar__logo}>
        <img src="/app-icon.png" alt="" aria-hidden="true" width={34} height={34} />
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