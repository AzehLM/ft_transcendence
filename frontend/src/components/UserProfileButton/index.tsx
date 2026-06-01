import { useEffect, useState } from "react";
import { User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../../services/api.service";
import styles from "./UserProfileButton.module.css";

interface UserProfileButtonProps {
    isOpen?: boolean;
    onClick?: () => void;
}

export function UserProfileButton({ isOpen = false, onClick }: UserProfileButtonProps) {
    const navigate = useNavigate();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        let createdUrl: string | null = null;

        fetchWithRefresh("/api/user/me/avatar", { signal })
            .then(res => {
                if (!res.ok) return null;
                return res.blob();
            })
            .then(blob => {
                if (blob) {
                    createdUrl = URL.createObjectURL(blob);
                    setAvatarUrl(createdUrl);
                }
            })
            .catch(() => {});

        return () => {
            controller.abort();
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, []);

    useEffect(() => {
        const handleAvatarChanged = (event: Event) => {
            const customEvent = event as CustomEvent<string>;
             const nextUrl = customEvent.detail;
             setAvatarUrl(prev => {
                 if (prev && prev.startsWith("blob:") && prev !== nextUrl) {
                     URL.revokeObjectURL(prev);
                 }
                 return nextUrl;
             });
        };

        window.addEventListener("avatar-changed", handleAvatarChanged);
        return () => {
            window.removeEventListener("avatar-changed", handleAvatarChanged);
        };
    }, []);

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
                {avatarUrl
                    ? <img src={avatarUrl} alt="Profile" className={styles.profileAvatar} />
                    : <User className={styles.profileIcon} strokeWidth={1.5} />
                }
            </button>
        </div>
    );
}
