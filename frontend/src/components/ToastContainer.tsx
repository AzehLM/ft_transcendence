import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, Building2, Trash2, Edit3, User, X, Bell, File, Folder, FolderPlus, FolderMinus } from "lucide-react";
import { useNotifications, ToastItem } from "../contexts/NotificationContext";

// Map event types to icons and styling
const getEventMeta = (event: string) => {
  switch (event) {
    case "MEMBER_ADDED":
      return {
        Icon: UserPlus,
        bgColor: "rgba(222, 115, 86, 0.15)",
        borderColor: "var(--brand-primary)",
        iconColor: "var(--brand-primary)",
        title: "New member",
      };
    case "ADDED_TO_NEW_ORGA":
      return {
        Icon: Building2,
        bgColor: "rgba(43, 16, 8, 0.1)",
        borderColor: "var(--brand-dark)",
        iconColor: "var(--brand-dark)",
        title: "New organization",
      };
    case "ORGA_DELETED":
      return {
        Icon: Trash2,
        bgColor: "rgba(212, 24, 61, 0.1)",
        borderColor: "var(--destructive)",
        iconColor: "var(--destructive)",
        title: "Organization deleted",
      };
    case "ORGA_RENAMED":
      return {
        Icon: Edit3,
        bgColor: "rgba(59, 130, 246, 0.1)",
        borderColor: "#3b82f6",
        iconColor: "#3b82f6",
        title: "Organization renamed",
      };
    case "USER_PROFILE_UPDATED":
      return {
        Icon: User,
        bgColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "#10b981",
        iconColor: "#10b981",
        title: "Profile updated",
      };
    case "file_uploaded":
      return {
        Icon: File,
        bgColor: "rgba(16, 185, 129, 0.15)",
        borderColor: "#10b981",
        iconColor: "#10b981",
        title: "File uploaded",
      };
    case "file_deleted":
      return {
        Icon: Trash2,
        bgColor: "rgba(212, 24, 61, 0.15)",
        borderColor: "var(--destructive)",
        iconColor: "var(--destructive)",
        title: "File deleted",
      };
    case "file_moved":
      return {
        Icon: File,
        bgColor: "rgba(59, 130, 246, 0.15)",
        borderColor: "#3b82f6",
        iconColor: "#3b82f6",
        title: "File moved",
      };
    case "folder_created":
      return {
        Icon: FolderPlus,
        bgColor: "rgba(222, 115, 86, 0.15)",
        borderColor: "var(--brand-primary)",
        iconColor: "var(--brand-primary)",
        title: "Folder created",
      };
    case "folder_deleted":
      return {
        Icon: FolderMinus,
        bgColor: "rgba(212, 24, 61, 0.15)",
        borderColor: "var(--destructive)",
        iconColor: "var(--destructive)",
        title: "Folder deleted",
      };
    case "folder_renamed":
      return {
        Icon: Folder,
        bgColor: "rgba(59, 130, 246, 0.15)",
        borderColor: "#3b82f6",
        iconColor: "#3b82f6",
        title: "Folder renamed",
      };
    case "folder_moved":
      return {
        Icon: Folder,
        bgColor: "rgba(59, 130, 246, 0.15)",
        borderColor: "#3b82f6",
        iconColor: "#3b82f6",
        title: "Folder moved",
      };
    default:
      return {
        Icon: Bell,
        bgColor: "rgba(107, 114, 128, 0.1)",
        borderColor: "#6b7280",
        iconColor: "#6b7280",
        title: "Notification",
      };
  }
};

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const { Icon, bgColor, borderColor, iconColor, title } = getEventMeta(toast.event);


  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        width: "360px",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        padding: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        pointerEvents: "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/*   bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: borderColor,
        }}
      />

      {/* Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: bgColor,
          color: iconColor,
          flexShrink: 0,
          marginLeft: "4px",
        }}
      >
        <Icon size={18} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
        <h4
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--brand-dark)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h4>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "13px",
            color: "#555",
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {toast.message}
        </p>
      </div>

      {/* Close  */}
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#999",
          padding: "4px",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition-base)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <X size={14} />
      </button>

      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 5, ease: "linear" }}
        onAnimationComplete={onClose}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          backgroundColor: borderColor,
          opacity: 0.8,
        }}
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
