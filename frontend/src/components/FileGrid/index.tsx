import { FileCard } from "../FileCard";
import styles from "./FileGrid.module.css";
import { OrgHeader } from "../OrgHeader";

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
  onDelete: (id: string) => void;
  showActionButtons?: boolean;
  isTrash?: boolean;
  orgName?: string;
}

export function FileGrid({ title, subtitle, files, loading, error, onDelete, showActionButtons = true, isTrash = false, orgName }: FileGridProps) {
  const isOrgPage = !!orgName;

  return (
    <div className={styles.page}>
      {isOrgPage && <OrgHeader orgName={orgName} showActionButtons={showActionButtons}></OrgHeader>}
      <div className={showActionButtons && !isOrgPage ? styles.contentArea : styles.contentAreaNoButtons}>
        <h1 className={styles.title}>{title}</h1>
        <h2 className={styles.subtitle}>{subtitle}</h2>
        {error && <p style={{ color: "#de7356", marginBottom: "16px" }}>{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className={styles.fileGrid}>
            {files.map((file) => (
            <FileCard key={file.id} id={file.id} name={file.name} isTrash={isTrash} onDelete={onDelete} />            ))}
          </div>
        )}
      </div>
    </div>
  );
}