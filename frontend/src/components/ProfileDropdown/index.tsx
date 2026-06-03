import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../services/auth.service";
import styles from "./ProfileDropdown.module.css";

export function ProfileDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout((path) => navigate(path));
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dropdown__menu}>
        <div className={styles.dropdown__header}>
          <p className={styles.dropdown__header__email}>Account</p>
        </div>
        <Link to="/profile" onClick={onClose} className={styles.dropdown__item}>
          Profile
        </Link>
        <Link to="/usage" onClick={onClose} className={styles.dropdown__item}>
          Storage
        </Link>
        <Link to="/account" onClick={onClose} className={styles.dropdown__item}>
          Account
        </Link>
        <button onClick={handleLogout} className={`${styles.dropdown__item} ${styles["dropdown__item--danger"]}`}>
          Log out
        </button>
      </div>
    </>
  );
}
