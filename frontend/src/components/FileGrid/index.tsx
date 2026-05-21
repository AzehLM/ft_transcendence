import { FileCard } from "../FileCard";
import styles from "./FileGrid.module.css";
import { OrgHeader } from "../OrgHeader";
import { FolderItem } from "../../services/files.service";
import { ConfirmationModal } from "../ConfirmationModal";
import { useState } from "react";


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
  onCreateFolder?: (name: string) => void;
  onDownloadFile?: (id: string) => void;
  orgDesc?: string;
  folders: FolderItem[];
}

export function FileGrid({ title, subtitle, files, loading, error, onDeleteFile, onDeleteFolder, showActionButtons = true, isTrash = false, orgName, orgId, onUploadFile, onCreateFolder, onDownloadFile, orgDesc, folders }: FileGridProps) {
  const isOrgPage = orgName !== undefined;

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);

  const handleCreateFolderSubmit = async () => {
    if (!folderName.trim()) {
        setFolderError("Invalid Name")
        return;
    }
    try {
      await onCreateFolder?.(folderName);
      setFolderName("");
      setIsFolderModalOpen(false);
      setFolderError(null);
    } catch (err: any) {
      setFolderError(err.message || "Failed to create folder.");
    }
  };

  return (
    <div className={styles.page}>

      <ConfirmationModal
        isOpen={isFolderModalOpen}
        fileName={folderName}
        onConfirm={handleCreateFolderSubmit}
        onCancel={() => { setIsFolderModalOpen(false); setFolderError(null); }}
        isCreateFolder={true}
        inputValue={folderName}
        onInputChange={setFolderName}
        errorMessage={folderError ?? undefined}
      />
      {isOrgPage && <OrgHeader 
        orgName={orgName} 
        orgDesc={orgDesc} 
        showActionButtons={showActionButtons} 
        onUploadFile={onUploadFile} 
        onCreateFolder={() => setIsFolderModalOpen(true)}></OrgHeader>}
      <div className={showActionButtons && !isOrgPage ? styles.contentArea : styles.contentAreaNoButtons}>
        <h1 className={styles.title}>{title}</h1>
        <h2 className={styles.subtitle}>{subtitle}</h2>
        {error && <p style={{ color: "#de7356", marginBottom: "16px" }}>{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : files.length === 0 && folders.length === 0  ? (
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