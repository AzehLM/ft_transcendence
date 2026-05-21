import { FileCard } from "../FileCard";
import styles from "./FileGrid.module.css";
import { OrgHeader } from "../OrgHeader";
import { FolderItem } from "../../services/files.service";

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
  onDeleteFile: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  showActionButtons?: boolean;
  isTrash?: boolean;
  orgName?: string;
  orgId?: string;
  onUploadFile?: (file: File) => void;
  onCreateFolder?: () => void;
  onDownloadFile?: (id: string) => void;
  orgDesc?: string;
  folders: FolderItem[];
}

export function FileGrid({ title, subtitle, files, loading, error, onDeleteFile, onDeleteFolder, showActionButtons = true, isTrash = false, orgName, orgId, onUploadFile, onCreateFolder, onDownloadFile, orgDesc, folders }: FileGridProps) {
  const isOrgPage = orgName !== undefined;

  return (
    <div className={styles.page}>
      {isOrgPage && <OrgHeader orgName={orgName} orgDesc={orgDesc} showActionButtons={showActionButtons} onUploadFile={onUploadFile} onCreateFolder={onCreateFolder}></OrgHeader>}
      <div className={showActionButtons && !isOrgPage ? styles.contentArea : styles.contentAreaNoButtons}>
        <h1 className={styles.title}>{title}</h1>
        <h2 className={styles.subtitle}>{subtitle}</h2>
        {error && <p style={{ color: "#de7356", marginBottom: "16px" }}>{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : files.length === 0 ? (
          <p style={{ color: "#999", marginTop: "2rem"}}>No files yet.</p>
        ) : (
          <div className={styles.fileGrid}>
            {folders.map((folder) => (
              <FileCard
                key={folder.id}
                id={folder.id}
                name={folder.name}
                isFolder={true}
                isTrash={false}
                orgId={orgId}
                onDelete={onDeleteFolder}
              />
            ))}
            {files.map((file) => (
            <FileCard key={file.id} id={file.id} name={file.name} isTrash={isTrash} onDelete={onDeleteFile} onDownload={onDownloadFile} orgId={orgId} />            ))}
          </div>
        )}
      </div>
    </div>
  );
}