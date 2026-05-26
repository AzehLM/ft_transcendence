import { UserPlus, Building2, Trash2, Edit3, User, Bell, Check, Trash, CheckSquare, File, Folder, FolderPlus, FolderMinus } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";
import styles from "./NotificationDropdown.module.css";

const getEventMeta = (event: string) => {
  switch (event) {
    case "MEMBER_ADDED":
      return {
        Icon: UserPlus,
        bgColor: "rgba(222, 115, 86, 0.1)",
        iconColor: "var(--brand-primary)",
      };
    case "ADDED_TO_NEW_ORGA":
      return {
        Icon: Building2,
        bgColor: "rgba(43, 16, 8, 0.08)",
        iconColor: "var(--brand-dark)",
      };
    case "ORGA_DELETED":
      return {
        Icon: Trash2,
        bgColor: "rgba(212, 24, 61, 0.08)",
        iconColor: "var(--destructive)",
      };
    case "ORGA_RENAMED":
      return {
        Icon: Edit3,
        bgColor: "rgba(59, 130, 246, 0.08)",
        iconColor: "#3b82f6",
      };
    case "USER_PROFILE_UPDATED":
      return {
        Icon: User,
        bgColor: "rgba(16, 185, 129, 0.08)",
        iconColor: "#10b981",
      };
    case "file_uploaded":
      return {
        Icon: File,
        bgColor: "rgba(16, 185, 129, 0.08)",
        iconColor: "#10b981",
      };
    case "file_deleted":
      return {
        Icon: Trash2,
        bgColor: "rgba(212, 24, 61, 0.08)",
        iconColor: "var(--destructive)",
      };
    case "file_moved":
      return {
        Icon: File,
        bgColor: "rgba(59, 130, 246, 0.08)",
        iconColor: "#3b82f6",
      };
    case "folder_created":
      return {
        Icon: FolderPlus,
        bgColor: "rgba(222, 115, 86, 0.1)",
        iconColor: "var(--brand-primary)",
      };
    case "folder_deleted":
      return {
        Icon: FolderMinus,
        bgColor: "rgba(212, 24, 61, 0.08)",
        iconColor: "var(--destructive)",
      };
    case "folder_renamed":
      return {
        Icon: Folder,
        bgColor: "rgba(59, 130, 246, 0.08)",
        iconColor: "#3b82f6",
      };
    case "folder_moved":
      return {
        Icon: Folder,
        bgColor: "rgba(59, 130, 246, 0.08)",
        iconColor: "#3b82f6",
      };
    default:
      return {
        Icon: Bell,
        bgColor: "rgba(107, 114, 128, 0.08)",
        iconColor: "#6b7280",
      };
  }
};

const formatRelativeTime = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay to close the dropdown when clicking outside */}
      <div
        onClick={onClose}
        className={styles.overlay}
      />

      <div className={styles.dropdown}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
            backgroundColor: "#fcfaf9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "15px",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--brand-dark)",
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: "var(--brand-primary)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  display: "inline-block",
                  lineHeight: 1,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--brand-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "var(--transition-base)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(222, 115, 86, 0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <CheckSquare size={16} />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                title="Clear all"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--destructive)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "var(--transition-base)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(212, 24, 61, 0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
          {notifications.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--muted-foreground)",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(230, 225, 224, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                  color: "var(--brand-primary)",
                }}
              >
                <Bell size={24} />
              </div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "var(--font-weight-medium)", color: "var(--brand-dark)" }}>
                All quiet!
              </p>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                You have no notifications.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const { Icon, bgColor, iconColor } = getEventMeta(item.event);

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
                    backgroundColor: item.isRead ? "transparent" : "rgba(222, 115, 86, 0.03)",
                    transition: "background-color 0.2s ease",
                    position: "relative",
                  }}
                >
                  {/* Event Icon */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: bgColor,
                      color: iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>

                  {/* Body & Time */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: item.isRead ? "normal" : "500",
                        color: "var(--brand-dark)",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.message}
                    </p>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--muted-foreground)",
                        display: "inline-block",
                        marginTop: "4px",
                      }}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  {/* Actions (Mark as Read / Clear) */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      marginLeft: "8px",
                      alignSelf: "stretch",
                    }}
                  >
                    {!item.isRead ? (
                      <button
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--brand-primary)",
                          padding: "2px",
                          borderRadius: "50%",
                          display: "flex",
                        }}
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <div style={{ width: "14px" }} />
                    )}

                    <button
                      onClick={() => clearNotification(item.id)}
                      title="Delete"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#ccc",
                        padding: "2px",
                        borderRadius: "50%",
                        display: "flex",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
