import { Outlet } from "react-router-dom";
import { ProfileDropdown } from "./components/ProfileDropdown";
import { SearchBar } from "./components/SearchBar";
import { UserProfileButton } from "./components/UserProfileButton";
import { useState } from "react";
import styles from "./MainLayout.module.css";
import { Bell } from "lucide-react";
import { Footer } from "./components/Footer";
import { useNotifications } from "./contexts/NotificationContext";
import { NotificationDropdown } from "./components/NotificationDropdown";
import { ToastContainer } from "./components/ToastContainer";

export function MainLayout({ sidebar }: { sidebar: React.ReactNode }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();

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

            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: notificationsOpen ? "var(--brand-primary)" : "#666",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "50%",
                  transition: "var(--transition-base)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    backgroundColor: "var(--brand-primary)",
                    color: "#ffffff",
                    fontSize: "9px",
                    fontWeight: "bold",
                    borderRadius: "50%",
                    width: "15px",
                    height: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #ffffff",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
              />
            </div>

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

        <div style={{ flex: 1, overflow: "auto", minWidth: 0, backgroundColor: "#fffcfb", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
          <Footer hasSidebar={false} />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

