import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, Building2, Trash2, Edit3, User, X, Bell, File, Folder, FolderPlus, FolderMinus } from "lucide-react";
import { useNotifications, ToastItem } from "../../contexts/NotificationContext";
import styles from "./ToastContainer.module.css"


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
    <motion.div className={styles.toast}>
      {/*   bar */}
      <div className={styles.toastBar} style={{ backgroundColor: borderColor }} />

      {/* Icon */}
      <div
        className={styles.toastIcon}
        style={{
          backgroundColor: bgColor,
          color: iconColor,
        }}
      >
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className={styles.toastContent}>
        <h4 className={styles.toastTitle}>
          {title}
        </h4>
        <p className={styles.toastMessage}>
          {toast.message}
        </p>
      </div>

      {/* Close  */}
      <button
        onClick={onClose}
        className={styles.toastClose}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <X size={14} />
      </button>

      <motion.div
        className={styles.toastProgress}
        style={{ backgroundColor: borderColor }}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 5, ease: "linear" }}
        onAnimationComplete={onClose}
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  return (
    <div
        className={styles.toastContainer}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
