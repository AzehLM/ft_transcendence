import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./ProfileDropdown.module.css";

export function ProfileDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    window.location.href = "/login";
  };

  return (
    <>
      <div
        className={styles.overlay}
        onClick={onClose}
      />

      {/* Dropdown menu */}
      <div className={styles.dropdown__menu}>
        <div className={styles.dropdown__header}>
          <p className={styles.dropdown__header__email}>Account</p>
        </div>
        <Link
          to="/profile"
          onClick={onClose}
          className={styles.dropdown__item}
        >
          Profile
        </Link>
        <Link
          to="/account"
          onClick={onClose}
          className={styles.dropdown__item}
        >
          Account Settings
        </Link>
        <div className={styles.dropdown__divider} />
        <button
          onClick={handleLogout}
          className={`${styles.dropdown__item} ${styles["dropdown__item--danger"]}`}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
      <div className={styles.overlay} onClick={onClose} />
    </>
  );
}