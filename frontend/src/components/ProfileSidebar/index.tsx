import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";
import { User, HardDrive, Shield, Network } from "lucide-react";


export function ProfileSidebar() {
  return (
    <Sidebar>
      <SidebarLink to="/profile"       icon={<User />}    label="Profile" />
      <SidebarLink to="/storage"       icon={<HardDrive />} label="Storage" />
      <SidebarLink to="/account"       icon={<Shield />}  label="Account" />
      <SidebarLink to="/organizations" icon={<Network />} label="Organizations" />
    </Sidebar>
  );
}