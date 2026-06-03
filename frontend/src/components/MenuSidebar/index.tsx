import {Files, Network} from "lucide-react";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";

export function MenuSidebar() {
  return (
    <Sidebar>
      <SidebarLink to="/dashboard" icon={<Files />} label="Personal Space" />
      <SidebarLink to="/organizations" icon={<Network />} label="Organizations Space" />
    </Sidebar>
  );
}