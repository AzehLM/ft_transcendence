import { Outlet } from "react-router-dom";
import { ProfileDropdown } from "./components/ProfileDropdown"
import { SearchBar } from "./components/SearchBar";
import { UserProfileButton } from "./components/UserProfileButton";
import { useState } from "react";

export function MainLayout({ sidebar }: { sidebar: React.ReactNode }) {
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {sidebar}

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem" }}>
        <SearchBar />
        <div style={{ marginLeft: "auto", position: "relative" }}> 
          <UserProfileButton
            isOpen={profileDropdownOpen}
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          />
          <ProfileDropdown
            isOpen={profileDropdownOpen}
            onClose={() => setProfileDropdownOpen(false)}
          />
          </div>
        </div>

        {/* Contenu de la page */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}