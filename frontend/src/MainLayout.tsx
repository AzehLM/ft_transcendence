import { Outlet } from "react-router-dom";
import { ProfileDropdown } from "./components/ProfileDropdown"
import { SearchBar } from "./components/SearchBar";
import { UserProfileButton } from "./components/UserProfileButton";
import { useState } from "react";

export function MainLayout({ sidebar }: { sidebar: React.ReactNode }) {
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  return (
    <div style={{ display: "flex" }}>
        {sidebar}

        <SearchBar />

        <UserProfileButton
            isOpen={profileDropdownOpen}
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        />

        <ProfileDropdown isOpen={profileDropdownOpen} onClose={() => setProfileDropdownOpen(false)} />

      <div>
        <Outlet />
      </div>
    </div>
  );
}