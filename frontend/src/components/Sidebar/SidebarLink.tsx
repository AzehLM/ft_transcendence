import { useLocation, Link } from "react-router-dom";
import styles from "./Sidebar.module.css";

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  className?: string;
  matchStart?: boolean;
}

export function SidebarLink({ to, icon, label, className, matchStart }: SidebarLinkProps) {
  const location = useLocation();
  const isActive = matchStart ? location.pathname.startsWith(to) : location.pathname === to;

  return (
    <Link
      to={to}
      className={`${styles.sidebar__button} ${isActive ? styles["sidebar__button--active"] : ""} ${className ?? ""}`}
      style={{ textDecoration: "none" }}
    >
      <span className={styles.sidebar__button__icon}>{icon}</span>
      <span className={styles.sidebar__button__label}>{label}</span>
    </Link>
  );
}