import { useState, useEffect } from "react";
import { FilesService, FolderItem } from "../../services/files.service";
import { SidebarMenu } from "../Sidebar/SidebarMenu";
import { Settings, Users, Files, ArrowLeft, Folder } from "lucide-react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";

export function OrgSidebar() {

  const [foldersExpanded, setFoldersExpanded] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   FilesService.getAllFiles()
  //     .then((r) => setFolders(r.folders || []))
  //     .catch(() => setFolders([]))
  //     .finally(() => setLoading(false));
  // }, []);

  const { id } = useParams();

  return (
    <Sidebar>
      <SidebarLink to="/organizations" icon={<ArrowLeft />} label="Back" />
      <SidebarLink to={`/orgs/${id}/files`} icon={<Files />} label="All files" />
      <SidebarMenu
        label="Folders"
        icon={<Folder />}
        expanded={foldersExpanded}
        onToggle={() => setFoldersExpanded(!foldersExpanded)}
        items={folders}
        loading={loading}
      />
      <SidebarLink to={`/orgs/${id}/members`} icon={<Users />} label="Members" />
      <SidebarLink to={`/orgs/${id}/settings`} icon={<Settings />} label="Settings" />
    </Sidebar>
  );
}