import { Folder, Trash2, Files} from "lucide-react";
import { useState, useEffect } from "react";
import { FilesService, FolderItem } from "../../services/files.service";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";
import { SidebarMenu } from "../Sidebar/SidebarMenu";

export function MenuSidebar() {
  const [foldersExpanded, setFoldersExpanded] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    FilesService.getAllFiles()
      .then((r) => setFolders(r.folders || []))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Sidebar>
      <SidebarLink to="/dashboard" icon={<Files />} label="All files" />
      <SidebarMenu
        label="Folders"
        icon={<Folder />}
        expanded={foldersExpanded}
        onToggle={() => setFoldersExpanded(!foldersExpanded)}
        items={folders}
        loading={loading}
      />
      <SidebarLink to="/trash" icon={<Trash2 />} label="Trash" />
    </Sidebar>
  );
}