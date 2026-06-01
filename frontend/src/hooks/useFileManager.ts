import { FileItem, FolderItem, FilesService } from "../services/files.service";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessages } from "./useFeedbackMessage";

type LoadFn = () => Promise<{ files: FileItem[]; folders: FolderItem[] }>;

export function useFileManager(loadFn: LoadFn, navigateOnFolder: (id: string | null) => string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainError, setMainError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { messages, addMessage, removeMessage } = useMessages();

  // Load files
  const loadFiles = useCallback(async () => {
    const response = await loadFn();
    setFiles(response.files || []);
    setFolders(response.folders || []);
  }, [loadFn]);

  useEffect(() => {
    const load = async () => {
      setMainError(null);
      try {
        setLoading(true);
        await loadFiles();
      } catch (err: any) {
        if (err.status === 400 || err.status === 404) { navigate("/404"); return; }
        setMainError("Failed to load files.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [folderId, loadFiles, navigate]);

  // Handlers CRUD
  const handleDeleteFile = async (id: string, name: string) => {
    try {
      await FilesService.deleteFile(id);
      await loadFiles();
      name ? addMessage(`File "${name}" deleted`, "success") : addMessage(`File deleted`, "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to delete file:", err);
      addMessage(`Failed to delete file: ${errorMessage}`, "error");
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    try {
      await FilesService.deleteFolder(id);
      await loadFiles();
      name ? addMessage(`Folder "${name}" deleted`, "success") : addMessage(`Folder deleted`, "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to delete folder:", err);
      addMessage(`Failed to delete folder: ${errorMessage}`, "error");
    }
  };

  const handleRenameFolder = async (id: string, newName: string, prevName: string) => {
    try {
      await FilesService.updateFolder(id, { name: newName });
      await loadFiles();
      prevName ? addMessage(`Folder "${prevName}" renamed to "${newName}"`, "success") : addMessage(`Folder renamed`, "success");
    } catch (err: any) {
      addMessage(err.status === 404 ? "Folder not found." : err.message || "Failed to rename folder.", "error");
    }
  };

  const handleMoveFolder = async (id: string, newParentId: string | null, name: string) => {
    try {
      await FilesService.updateFolder(id, { parent_id: newParentId });
      await loadFiles();
      name ? addMessage(`Folder "${name}" moved`, "success") : addMessage(`Folder moved`, "success");
    } catch (err: any) {
      addMessage(err.status === 404 ? "File or folder not found." : err.message || "Failed to move.", "error");
    }
  };

  const handleMoveFile = async (id: string, newParentId: string | null, name: string) => {
    try {
      await FilesService.moveFile(id, newParentId);
      await loadFiles();
      name ? addMessage(`File "${name}" moved`, "success") : addMessage(`File moved`, "success");
    } catch (err: any) {
      addMessage(err.status === 404 ? "File or folder not found." : err.message || "Failed to move.", "error");
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

  return {
    files, folders, loading, mainError,
    breadcrumbs, loadFiles,
    messages, addMessage, removeMessage,
    handleDeleteFile, handleDeleteFolder,
    handleRenameFolder, handleMoveFolder, handleMoveFile,
    handleBreadcrumbClick,
  };
}