import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { useState } from "react";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import { fetchWithRefresh } from "../../services/api.service";
import { logout } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";


export default function ProfilePage() {
    const navigate = useNavigate();
    
    const handleDeleteAccount = async () => {
      await fetchWithRefresh("/api/auth/delete", { method: "DELETE" });
      logout(navigate);
    };
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    return (

        <SettingsLayout>
            <div className={styles.accountBoxes}>
                <div className={styles.mainBox}>
                    <h2 className={styles.subtitle}>Security</h2>
                    <div className={styles.handlePassword}>
                        <div className={styles.inputBox}>
                            <p>Current Password</p>
                            <input
                            type="text"
                            value={password}
                            placeholder="Enter current password"
                            onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className={styles.inputBox}>
                            <p>New Password</p>
                            <input
                            type="text"
                            value={newPassword}
                            placeholder="Enter new password"
                            onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className={styles.inputBox}>
                            <p>Confirm your new password</p>
                            <input
                            type="text"
                            value={confirmPassword}
                            placeholder="Enter new password"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <button className={`${styles.buttonChange} ${styles.profileButton}`}>Update Password</button>
                    </div>
                </div>
                <div className={styles.deleteBox}>
                <p className={styles.dangerTitle}>Danger Zone</p>
                <div className={styles.dangerRow}>
                    <div>
                    <p className={styles.dangerLabel}>If you want to delete your account, click on the button</p>
                    <p className={styles.dangerDescription}>This action cannot be undone</p>
                    </div>
                    <button className={styles.buttonDelete} onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
                    <DeleteConfirmationModal
                    isOpen={showDeleteConfirm}
                    fileName="your account"
                    onConfirm={handleDeleteAccount}
                    onCancel={() => setShowDeleteConfirm(false)}
                    isTrash={false}
                    isAccount={true}
                    />
                </div>
                </div>
            </div>
        </SettingsLayout>
    );
}