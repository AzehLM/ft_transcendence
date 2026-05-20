import { Outlet } from "react-router-dom";
import { ProfileDropdown } from "./components/ProfileDropdown"
import { SearchBar } from "./components/SearchBar";
import { UserProfileButton } from "./components/UserProfileButton";
import { useState } from "react";
import styles from "./MainLayout.module.css";
import { Bell} from "lucide-react";

export function MainLayout({ sidebar }: { sidebar: React.ReactNode }) {
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      {sidebar}

      <div className={styles.mainContainer}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.05)"
        }}>
          <SearchBar placeholder="Search members..." />
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}>
              <Bell size={20} />
            </button>
            <div style={{ position: "relative" }}>
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
        </div>

        <div style={{ flex: 1, overflow: "auto", minWidth: 0, backgroundColor: "#fffcfb" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

