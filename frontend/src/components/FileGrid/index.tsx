import { FileCard } from "../FileCard";
import { ActionButtons } from "../ActionButtons";
import styles from "./FileGrid.module.css";
import { OrgBadge } from "../OrgBadge";

interface FileItem {
  id: string;
  name: string;
  file_size: number;
  created_at: string;
}

interface FileGridProps {
  title: string;
  subtitle: string;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  onDelete: (fileName: string) => void;
  showActionButtons?: boolean;
  isTrash?: boolean;
  orgName?: string;
}

export function FileGrid({ title, subtitle, files, loading, error, onDelete, showActionButtons = true, isTrash = false, orgName }: FileGridProps) {
  return (
    <div className={styles.page}>
        <div className={styles.pageHeader}>
            {orgName && <OrgBadge orgName={orgName} />}
            {showActionButtons && <ActionButtons />}
        </div>
      <div className={showActionButtons ? styles.contentArea : styles.contentAreaNoButtons}>
        <h1 className={styles.title}>{title}</h1>
        <h2 className={styles.subtitle}>{subtitle}</h2>
        {error && <p style={{ color: "#de7356", marginBottom: "16px" }}>{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className={styles.fileGrid}>
            {files.map((file) => (
              <FileCard key={file.id} name={file.name} isTrash={isTrash} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}