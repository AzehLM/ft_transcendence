import { User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/dashboard.module.css";

interface UserProfileButtonProps {
    isOpen?: boolean;
    onClick?: () => void;
}

export function UserProfileButton({ isOpen = false, onClick }: UserProfileButtonProps) {
    const navigate = useNavigate();

    return (
        <div className={styles.profileButtonContainer}>
            <button
                onClick={() => navigate("/account")}
                className={styles.settingsIconButton}
                aria-label="Account settings"
            >
                <Settings className={styles.settingsIconOnly} strokeWidth={2.5} />
            </button>

            <button
                onClick={onClick}
                className={`${styles.profileButton} ${isOpen ? styles.profileButtonOpen : ""}`}
                aria-label="User profile"
            >
                <User className={styles.profileIcon} strokeWidth={2.5} />
            </button>
        </div>
    );
}
