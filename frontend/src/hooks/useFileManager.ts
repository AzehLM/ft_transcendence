import { FileItem, FolderItem, FilesService } from "../services/files.service";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

type LoadFn = () => Promise<{ files: FileItem[]; folders: FolderItem[] }>;

export function useFileManager(loadFn: LoadFn, navigateOnFolder: (id: string | null) => string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  const [hideMessage, setHideMessage] = useState(false);
  const { folderId } = useParams();
  const navigate = useNavigate();

  // Load files
  const loadFiles = useCallback(async () => {
    setSuccess("");
    setError(null);
    const response = await loadFn();
    setFiles(response.files || []);
    setFolders(response.folders || []);
  }, [loadFn]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await loadFiles();
      } catch (err: any) {
        if (err.status === 400 || err.status === 404) { navigate("/404"); return; }
        setError("Failed to load files.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [folderId]);

  // Handlers CRUD 
  const handleDeleteFile = async (id: string) => {
        setSuccess("");
        setError(null);
        try {
            await FilesService.deleteFile(id);
            await loadFiles();
            setSuccess("File deleted");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            console.error("Failed to delete file:", err);
            setError(`Failed to delete file: ${errorMessage}`);
        }
    };

  const handleDeleteFolder = async (id: string) => {
    setSuccess("");
    setError(null);
        try {
            await FilesService.deleteFolder(id);
            await loadFiles();
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
          await loadFiles();
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
          await loadFiles();
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
          await loadFiles();
          setSuccess("File moved");
      } catch (err: any) {
          if (err.status === 404) {
              setError("File or folder not found.");
          } else {
              setError(err.message || "Failed to move.");
          }
      }
  };

  // Breadcrumbs
  const handleBreadcrumbClick = (item: { id: string | null }, index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    navigate(navigateOnFolder(item.id));
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

  // Auto-hide messages
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

  return {
    files, folders, loading, error, success,
    breadcrumbs, hideMessage, setError, setSuccess, loadFiles,
    handleDeleteFile, handleDeleteFolder,
    handleRenameFolder, handleMoveFolder, handleMoveFile,
    handleBreadcrumbClick,
  };
}