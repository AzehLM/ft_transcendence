import { Folder, Files, Network} from "lucide-react";
import { useState, useEffect } from "react";
import { FilesService, FolderItem } from "../../services/files.service";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";
import { SidebarMenu } from "../Sidebar/SidebarMenu";

export function MenuSidebar() {
  return (
    <Sidebar>
      <SidebarLink to="/dashboard" icon={<Files />} label="All files" />
      <SidebarLink to="/organizations" icon={<Network />} label="Organizations" />
    </Sidebar>
  );
}