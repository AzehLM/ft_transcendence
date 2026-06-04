import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";
import { User, HardDrive, Shield, ChevronLeft } from "lucide-react";

export function ProfileSidebar() {
  return (
    <Sidebar>
      <SidebarLink to="/dashboard" icon={<ChevronLeft size={20} />} label="Back" />
      <div style={{ height: "1px", background: "rgba(0,0,0,0.05)", margin: "12px 0" }} />
      <SidebarLink to="/profile" icon={<User />} label="Profile" />
      <SidebarLink to="/usage" icon={<HardDrive />} label="Storage" />
      <SidebarLink to="/account" icon={<Shield />} label="Account" />
    </Sidebar>
  );
}