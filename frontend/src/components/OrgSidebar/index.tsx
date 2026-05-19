import { Settings, Users, Files, Building2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";

export function OrgSidebar() {
  const { id } = useParams();


  return (
    <Sidebar>
      <SidebarLink to={`/orgs/${id}/files`} icon={<Files size={20} />} label="All files" />
      <SidebarLink to="/organizations" icon={<Building2 size={20} />} label="Organizations" />
      <SidebarLink to={`/orgs/${id}/members`} icon={<Users size={20} />} label="Members" />
      <SidebarLink to={`/orgs/${id}/settings`} icon={<Settings size={20} />} label="Settings" />
    </Sidebar>
  );
}