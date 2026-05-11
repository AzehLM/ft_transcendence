import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { logout } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";
import { DangerZone } from "../../components/DangerZone";

export default function AccountPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const handleDeleteAccount = async () => {
    try {
        const response = await fetchWithRefresh("/api/auth/delete", { method: "DELETE" });
        
        if (!response.ok) {
        const data = await response.json();
        console.error("Failed to delete account:", data);
        setError(data.message || "Failed to delete account, please try again.");
        return;
        }

        logout(navigate);
    } catch (err) {
        console.error("Network error:", err);
        setError("Network error, please try again.");
    }
    };
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    
    return (

        <SettingsLayout>
            <div className={styles.accountBoxes}>
                <div className={styles.mainBox}>
                    <h2 className={styles.subtitle}>Security</h2>
                    <div className={styles.handlePassword}>
                        <div className={styles.inputBox}>
                            <p>Current Password</p>
                            <input type="password" style={{ display: "none" }} />
                            <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            placeholder="Enter current password"
                            onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className={styles.inputBox}>
                            <p>New Password</p>
                            <input
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            placeholder="Enter new password"
                            onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className={styles.inputBox}>
                            <p>Confirm your new password</p>
                            <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            placeholder="Confirm new password"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <button className={`${styles.buttonChange} ${styles.profileButton}`}>Update Password</button>
                    </div>
                </div>
                <DangerZone
                label="If you want to delete your account, click on the button"
                description="This action cannot be undone"
                buttonText="Delete Account"
                fileName="your account"
                onConfirm={handleDeleteAccount}
                isAccount={true}
                error={error}
                />
            </div>
        </SettingsLayout>
    );
}