import { Link } from "react-router-dom";
import styles from "../styles/components.module.css";

export function ProfileDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className={styles.dropdownOverlay}
        onClick={onClose}
      />

      {/* Dropdown menu */}
      <div className={styles.dropdownMenu}>
        <Link
          to="/profile"
          onClick={onClose}
          className={styles.dropdownItem}
        >
          Profile
        </Link>
        <Link
          to="/storage"
          onClick={onClose}
          className={styles.dropdownItem}
        >
          Storage
        </Link>
        <Link
          to="/account"
          onClick={onClose}
          className={styles.dropdownItem}
        >
          Account
        </Link>
        <Link
          to="/organization"
          onClick={onClose}
          className={styles.dropdownItem}
        >
          Organisation
        </Link>
      </div>
    </>
  );
}