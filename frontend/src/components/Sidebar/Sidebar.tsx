import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import styles from "./Sidebar.module.css";

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.sidebar}>
      <Link to="/" className={styles.sidebar__logo}>
        <Package className="w-11 h-11" strokeWidth={2} />
        ostrom
      </Link>
      <div className={styles.sidebar__links}>
        {children}
      </div>
    </div>
  );
}