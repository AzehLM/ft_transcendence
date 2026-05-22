import { FileCard } from "../FileCardOrg";
import styles from "./FileGrid.module.css";
import { OrgHeader } from "../OrgHeader";
import { FolderItem } from "../../services/files.service";
import { ConfirmationModal } from "../ConfirmationModal";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FilesService } from "../../services/files.service";
import { useParams } from "react-router-dom";
import dashboardStyles from "../../pages/Dashboard/Dashboard.module.css"

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
  // error: string | null;
  onDeleteFile: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  showActionButtons?: boolean;
  orgName?: string;
  orgId?: string;
  onUploadFile?: (file: File) => void;
  onCreateFolder?: (name: string) => void;
  onDownloadFile?: (id: string) => void;
  orgDesc?: string;
  folders: FolderItem[];
  onRename?: (id: string, newName: string) => Promise<void>;
  onMoveFolder?: (id: string, newParentId: string | null) => Promise<void>;
  onMoveFile?: (id: string, newParentId: string | null) => Promise<void>;

}

export function FileGrid({ title, subtitle, files, loading, onDeleteFile, onDeleteFolder, onRename, onMoveFolder, onMoveFile, showActionButtons = true, orgName, orgId, onUploadFile, onCreateFolder, onDownloadFile, orgDesc, folders }: FileGridProps) {
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

    const navigate = useNavigate();
    const { folderId } = useParams();

    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Root" }
    ]);

    const handleBreadcrumbClick = (item: { id: string | null }, index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    if (item.id) {
        navigate(`/orgs/${orgId}/files/${item.id}`);
    } else {
        navigate(`/orgs/${orgId}/files`);
    }
    };

    useEffect(() => {
    if (!folderId) {
        setBreadcrumbs([{ id: null, name: "Root" }]);
        return;
    }

    FilesService.getFolderPath(folderId)
        .then(data => {
        setBreadcrumbs([
            { id: null, name: "Root" },
            ...data.map((f) => ({ id: f.id, name: f.name }))
        ]);
        })
        .catch(() => setBreadcrumbs([{ id: null, name: "Root" }]));
    }, [folderId]);

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
        {/* {error && <p style={{ color: "#de7356", marginBottom: "16px" }}>{error}</p>} */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 5% 16px" }}>
        {breadcrumbs.map((item, index) => (
            <span key={index} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {index > 0 && <ChevronRight size={14} style={{ color: "#999" }} />}
            <button
            onClick={() => handleBreadcrumbClick(item, index)}
            className={`${dashboardStyles.breadcrumbBtn} ${index === breadcrumbs.length - 1 ? dashboardStyles.breadcrumbBtnActive : ""}`}
            >
            {item.name}
            </button>
            </span>
        ))}
        </div>
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
                orgId={orgId}
                onDelete={onDeleteFolder}
                onRename={onRename}
                onMove={onMoveFolder}
              />
            ))}
            {files.map((file) => (
            <FileCard 
              key={file.id} 
              id={file.id} 
              name={file.name} 
              onDelete={onDeleteFile} 
              onDownload={onDownloadFile} 
              orgId={orgId}
              onMove={onMoveFile}
            />            
            ))}
          </div>
        )}
      </div>
    </div>
  );
}