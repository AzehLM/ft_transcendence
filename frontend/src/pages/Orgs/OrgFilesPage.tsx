import { useState, useEffect } from "react";
import { FileItem, FilesService, FolderItem } from "../../services/files.service";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownloadOrg } from "../../hooks/useE2EEDownloadOrg";
import styles from "../Dashboard/Dashboard.module.css";
import { OrgLayout } from "./OrgLayout";
import { Breadcrumb } from "../../components/Breadcrumb";
import { UploadStatus } from "../../components/UploadStatus.tsx";
import { FolderCard } from "../../components/FolderCard";
import { FileCard } from "../../components/FileCard"
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { ActionButtons } from "../../components/ActionButtons";
import { useNotifications } from "../../contexts/NotificationContext";
import { OrgKeyProvider } from "../../contexts/OrgKeyContext";

export default function OrgFilesPage() {
  const { id } = useParams();
  const { folderId } = useParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const { registerListener, unregisterListener } = useNotifications();


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess("");
        const response = folderId
          ? await FilesService.getOrgaFilesFolders(folderId, id!)
          : await FilesService.getOrgaFilesFolders("00000000-0000-0000-0000-000000000000", id!);
        setFiles(response.files || []);
        setFolders(response.folders || []);
      } catch (err: any) {
        if (err.status === 400 || err.status === 404) {
          navigate("/404");
          return;
        }
        setError("Failed to load files.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [folderId, id]);

  const loadFiles = async (currentFolderId?: string) => {
    setSuccess("");
    setError(null);
    const response = currentFolderId
      ? await FilesService.getOrgaFilesFolders(currentFolderId, id!)
      : await FilesService.getOrgaFilesFolders("00000000-0000-0000-0000-000000000000", id!);
    setFiles(response.files || []);
    setFolders(response.folders || []);
  };

  useEffect(() => {
    const handleFilesChange = () => {
      loadFiles(folderId);
    };

    registerListener("file_uploaded", handleFilesChange);
    registerListener("file_deleted", handleFilesChange);
    registerListener("file_moved", handleFilesChange);
    registerListener("folder_created", handleFilesChange);
    registerListener("folder_deleted", handleFilesChange);
    registerListener("folder_renamed", handleFilesChange);
    registerListener("folder_moved", handleFilesChange);

    return () => {
      unregisterListener("file_uploaded", handleFilesChange);
      unregisterListener("file_deleted", handleFilesChange);
      unregisterListener("file_moved", handleFilesChange);
      unregisterListener("folder_created", handleFilesChange);
      unregisterListener("folder_deleted", handleFilesChange);
      unregisterListener("folder_renamed", handleFilesChange);
      unregisterListener("folder_moved", handleFilesChange);
    };
  }, [registerListener, unregisterListener, id, folderId]);

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (res.status === 404 || res.status === 400) { navigate("/404"); return; }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => { if (data) { setOrgName(data.name); setOrgDesc(data.description); } })
      .catch(() => setOrgName("Unknown"));
  }, [id]);

  const { uploadFile, uploads } = useE2EEUpload(() => {
    setSuccess("");
    setError(null);
    loadFiles(folderId);
  }, id, folderId);

  const activeUploads = Object.values(uploads);
  const isUploading = activeUploads.some(u => u.isUploading);

  const { downloadAndDecryptOrg, downloadStatus, isDownloading } = useE2EEDownloadOrg();

  const handleDownload = (fileId: string) => {
    downloadAndDecryptOrg(fileId, id!);
  };

  const handleDeleteFile = async (fileId: string) => {
        setSuccess("");
        setError(null);
         try {
             await FilesService.deleteFile(fileId);
             await loadFiles(folderId);
             setSuccess("File deleted");
         } catch (err) {
             const errorMessage = err instanceof Error ? err.message : "Unknown error";
             console.error("Failed to delete file:", err);
             setError(`Failed to delete file: ${errorMessage}`);
         }
  };

  const handleDeleteFolder = async (folderIdDeleted: string) => {
    setSuccess("");
    setError(null);
      try {
          await FilesService.deleteFolder(folderIdDeleted);
          await loadFiles(folderId);
          setSuccess("Folder deleted");
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.error("Failed to delete folder:", err);
          setError(`Failed to delete folder: ${errorMessage}`);
      }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
      setSuccess("");
      setError(null);
      try {
          await FilesService.updateFolder(id, {
              name: newName,
          });
          await loadFiles(folderId);
          setSuccess("Folder renamed");
      } catch (err: any) {
          if (err.status === 404) {
              setError("Folder not found.");
          } else {
              setError(err.message || "Failed to rename folder.");
          }
      }
  };

  const handleMoveFolder = async (id: string, newParentId: string | null) => {
      setSuccess("");
      setError(null);
      try {
          await FilesService.updateFolder(id, {
              parent_id: newParentId,
          });
          await loadFiles(folderId);
          setSuccess("Folder moved");
      } catch (err: any) {
          if (err.status === 404) {
              setError("File or folder not found.");
          } else {
              setError(err.message || "Failed to move.");
          }
      }
  };


  const handleMoveFile = async (id: string, newParentId: string | null) => {
      setSuccess("");
      setError(null);
      try {
          await FilesService.moveFile(id, newParentId);
          await loadFiles(folderId);
          setSuccess("File moved");
      } catch (err: any) {
          if (err.status === 404) {
              setError("File or folder not found.");
          } else {
              setError(err.message || "Failed to move.");
          }
      }
    };

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);

  const handleCreateFolderSubmit = async () => {
        setSuccess("");
        setError(null);
    if (!folderName.trim()) {
        setFolderError("Invalid Name")
        return;
    }
    try {
      await FilesService.createFolder(folderName, folderId, id);
      await loadFiles(folderId);
      setSuccess("Folder created");
      setFolderName("");
      setIsFolderModalOpen(false);
      setFolderError(null);
    } catch (err: any) {
      setFolderError(err.message || "Failed to create folder.");
    }
  };

    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Root" }
    ]);

    const handleBreadcrumbClick = (item: { id: string | null }, index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    if (item.id) {
        navigate(`/orgs/${id}/files/${item.id}`);
    } else {
        navigate(`/orgs/${id}/files`);
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

    const [hideMessage, setHideMessage] = useState(false);

        useEffect(() => {
        if (success || error) {
            setHideMessage(false);

            const timer = setTimeout(() => {
                setHideMessage(true);

                setTimeout(() => {
                    setSuccess('');
                    setError('');
                }, 400);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [success, error]);

  return (
    <>
    <OrgLayout orgName={orgName} orgDesc={orgDesc}>
      <OrgKeyProvider orgId={id}>
      <div className={styles.container}>
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

        <ActionButtons onUploadFile={uploadFile}
                        onCreateFolder={() => setIsFolderModalOpen(true)}
          />

        <div className={styles.headerSection}>
            <div className={styles.titleGroup}>
                <h1>
                    Organization space
                </h1>
                <h2 className={styles.subtitle}>
                    All files and folders
                </h2>
            </div>

            <div className={styles.uploadContainer}>
                <Breadcrumb items={breadcrumbs} onNavigate={handleBreadcrumbClick} />
                <UploadStatus
                    uploads={activeUploads}
                    downloadStatus={downloadStatus}
                    error={error}
                    success={success}
                    hideMessage={hideMessage}
                />
            </div>

            {loading ? (
                <p>Loading files...</p>
                ) : files.length === 0 && folders.length === 0 ? (
                <p className={styles.noFile}>No files yet.</p>
                ) : (
                <div className={styles.contentsGrid} style={{ opacity: isDownloading || isUploading ? 0.5 : 1 }}>
                    {
                        folders.length > 0 && (
                            <div className={styles.itemsGrid}>
                                <p className={styles.itemsTitle}>FOLDERS</p>
                                <div className={styles.foldersGrid}>
                                    {folders.map(folder => (
                                    <FolderCard
                                        key={folder.id}
                                        id={folder.id}
                                        name={folder.name}
                                        createdAt={folder.created_at}
                                        onDelete={handleDeleteFolder}
                                        onRename={handleRenameFolder}
                                        onMove={handleMoveFolder}
                                        orgId={id}
                                    />
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    {
                        files.length > 0 && (
                            <div className={styles.itemsGrid}>
                                <p className={styles.itemsTitle}>FILES</p>
                                <div className={styles.filesList}>
                                    {files.map(file => (
                                    <FileCard
                                        key={file.id}
                                        id={file.id}
                                        name={file.name}
                                        fileSize={file.file_size}
                                        onDelete={handleDeleteFile}
                                        onDownload={handleDownload}
                                        onMove={handleMoveFile}
                                        orgId={id}
                                    />
                                    ))}
                                </div>
                            </div>
                        )
                    }
                </div>
            )}
          </div>
      </div>
      </OrgKeyProvider>
    </OrgLayout>
    </>
  );
}