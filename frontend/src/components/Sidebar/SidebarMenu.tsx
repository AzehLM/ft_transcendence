import { ChevronDown } from "lucide-react";
import styles from "./Sidebar.module.css";

interface SidebarMenuProps {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  items: { id: string; name: string }[];
  loading?: boolean;
  onItemClick?: (id: string) => void;
}

export function SidebarMenu({ label, icon, expanded, onToggle, items, loading, onItemClick }: SidebarMenuProps) {
  return (
    <>
      <button onClick={onToggle} className={styles.sidebar__button}>
        <ChevronDown className={`${styles.sidebar__chevron} ${expanded ? "" : styles.sidebar__chevron__rotated}`} />
        <span className={styles.sidebar__button__label}>{label}</span>
      </button>

        {expanded && !loading && items.map((item) => (
        <button key={item.id} className={styles.sidebar__folder} onClick={() => onItemClick?.(item.id)}>
            {icon}
            <span className={styles.sidebar__button__label}>{item.name}</span>
        </button>
        ))}
    </>
  );
}