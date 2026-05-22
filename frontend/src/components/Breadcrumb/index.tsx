import { ChevronRight } from "lucide-react";
import styles from "./Breadcrumb.module.css";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <div className={styles.breadcrumb}>
      {items.map((item, index) => (
        <span key={index} className={styles.item}>
          {index > 0 && <ChevronRight size={14} className={styles.separator} />}
          <button
            onClick={() => onNavigate(item, index)}
            className={`${styles.btn} ${index === items.length - 1 ? styles.active : ""}`}
          >
            {item.name}
          </button>
        </span>
      ))}
    </div>
  );
}