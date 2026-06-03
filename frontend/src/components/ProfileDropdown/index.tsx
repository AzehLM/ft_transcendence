import { Link } from "react-router-dom";
import styles from "./ProfileDropdown.module.css";

export function ProfileDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dropdown__menu}>
        <Link to="/profile" onClick={onClose} className={styles.dropdown__item}>
          Profile
        </Link>
        <Link to="/usage" onClick={onClose} className={styles.dropdown__item}>
          Storage
        </Link>
        <Link to="/account" onClick={onClose} className={styles.dropdown__item}>
          Account
        </Link>
      </div>
    </>
  );
}
