import { Outlet } from "react-router-dom";
import { ProfileDropdown } from "./components/ProfileDropdown";
import { UserProfileButton } from "./components/UserProfileButton";
import { useState } from "react";
import styles from "./MainLayout.module.css";
import { Bell, Menu, X } from "lucide-react";
import { Footer } from "./components/Footer";
import { useNotifications } from "./contexts/NotificationContext";
import { NotificationDropdown } from "./components/NotificationDropdown";
import { ToastContainer } from "./components/ToastContainer";

export function MainLayout({ sidebar }: { sidebar: React.ReactNode }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <div className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.sidebarActive : ""}`}>
        {sidebar}
      </div>

      {sidebarOpen && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={styles.mainContainer}>
        <div className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <button
              type="button"
              className={styles.hamburgerButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <div className={styles.actionsContainer}>

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

        <div style={{ flex: 1, overflow: "auto", minWidth: 0, backgroundColor: "#fff8f6", display: "flex", flexDirection: "column" }}>
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

