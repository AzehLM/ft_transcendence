import { useState, useEffect } from "react";
import { FileItem, FilesService, FolderItem } from "../../services/files.service";
import { FileGrid } from "../../components/FileGrid";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useE2EEUpload } from "../../hooks/useE2EEUpload";
import { useE2EEDownloadOrg } from "../../hooks/useE2EEDownloadOrg";
import styles from "../Dashboard/Dashboard.module.css";

export default function OrgFilesPage() {
  const { id } = useParams();
  const { folderId } = useParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);


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

  const { downloadAndDecryptOrg, downloadStatus } = useE2EEDownloadOrg();

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

  const handleDeleteFolder = async (folderId: string) => {
    setSuccess("");
    setError(null);
      try {
          await FilesService.deleteFolder(folderId);
          await loadFiles(folderId);
          setSuccess("Folder deleted");
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.error("Failed to delete folder:", err);
          setError(`Failed to delete folder: ${errorMessage}`);
      }
  };

  const handleCreateFolder = async (name: string) => {
    setSuccess("");
    setError(null);

    try {
      await FilesService.createFolder(name, folderId, id);
      await loadFiles(folderId);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to create folder: ${errorMessage}`);
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

  return (
    <>
      <div className={styles.uploadContainer} style={{ margin: "20px 5%", marginTop: 0 }}>
        {error && (
          <div className={`${styles.statusMessage} ${styles.error}`}>
            {error}
          </div>
        )}
        {success && (
            <div className={`${styles.statusMessage} ${success.includes('Erreur') ? styles.error : styles.success}`}>
                {success}
            </div>
        )}

        {activeUploads.map(upload => (
            <div key={upload.id} style={{ marginBottom: '20px' }}>
                <div className={`${styles.statusMessage} ${upload.status.includes('Erreur') ? styles.error : styles.loading}`}>
                    {!upload.status.includes('Erreur') && <span className={styles.statusDot}></span>}
                    {upload.status}
                </div>

                <div className={styles.fileInfoCard}>
                    <div className={styles.fileName}>{upload.fileInfo.name}</div>
                    <div className={styles.fileDetails}>
                        <span><strong>Type:</strong> {upload.fileInfo.type}</span>
                        <span><strong>Taille:</strong> {upload.fileInfo.size}</span>
                    </div>
                </div>

                {upload.progress && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressHeader}>
                            <div className={styles.progressTitleContainer}>
                                <div className={styles.progressTitle}>Chiffrement & Upload</div>
                                <div className={styles.progressSubtitle}>{upload.fileInfo.name}</div>
                            </div>
                            <div className={styles.progressPercentage}>{upload.progress.percentage}%</div>
                        </div>
                        <div className={styles.progressBarContainer}>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${upload.progress.percentage}%` }}
                                />
                            </div>
                        </div>
                        <div className={styles.progressMetrics}>
                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>Vitesse</div>
                                <div className={styles.metricValue}>
                                    {(upload.progress.speed / (1024 * 1024)).toFixed(2)} MB/s
                                </div>
                            </div>
                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>Progression</div>
                                <div className={styles.metricValue}>
                                    {((upload.progress.uploadedBytes) / (1024 * 1024)).toFixed(1)} / {((upload.progress.totalBytes) / (1024 * 1024)).toFixed(0)} MB
                                </div>
                            </div>
                            <div className={styles.metric}>
                                <div className={styles.metricLabel}>Temps restant</div>
                                <div className={styles.metricValue}>
                                    {Math.round(upload.progress.remainingTime)}s
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}

        {downloadStatus && (
           <div className={`${styles.statusMessage} ${downloadStatus.includes('Erreur') ? styles.error : downloadStatus.includes('Succès') ? styles.success : styles.loading}`}>
            {!downloadStatus.includes('Erreur') && !downloadStatus.includes('Succès') && <span className={styles.statusDot}></span>}
            {downloadStatus}
          </div>
        )}
      </div>
      <FileGrid
        title="Organization files"
        subtitle="All files"
        files={files}
        folders={folders}
        loading={loading}
        onDeleteFile={handleDeleteFile}
        onDeleteFolder={handleDeleteFolder}
        orgName={orgName}
        orgId={id}
        orgDesc={orgDesc}
        showActionButtons={true}
        onUploadFile={uploadFile}
        onCreateFolder={handleCreateFolder}
        onDownloadFile={handleDownload}
        onRename={handleRenameFolder}
        onMoveFolder={handleMoveFolder}
        onMoveFile={handleMoveFile}
      />
    </>
  );
}