import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { useState } from "react";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { fetchWithRefresh } from "../../services/api.service";
import { logout } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";
import { changePasswordSchema } from "../../schemas/auth.schema";


export default function AccountPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleUpdatePassword = async () => {
        setPasswordError(null);

        const result = changePasswordSchema.safeParse( { current: password, newPassword: newPassword, confirmPassword: confirmPassword });
        if (!result.success) {
            setPasswordError(result.error.issues[0].message);
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetchWithRefresh("/api/auth/password", {
                method: "POST",
                body: JSON.stringify({
                    // nothing in here works yet, we need all of this:
                    // https://github.com/AzehLM/ft_transcendence/blob/docs/general-documentation/docs/api_routes.md#put-userspassword
                    // data needs to be changed
                    current_password: result.data.current,
                    new_password: result.data.newPassword,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                setPasswordError(data.message || "Failed to update password.");
                return;
            }

            setPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setPasswordError("Network error, please try again.");
        } finally {
            setIsUpdating(false);
        }
    }

    const handleDeleteAccount = async () => {
    try {
        const response = await fetchWithRefresh("/api/auth/delete", { method: "DELETE" });

        if (!response.ok) {
        const data = await response.json();
        console.error("Failed to delete account:", data);
        setShowDeleteConfirm(false);
        setError(data.message || "Failed to delete account, please try again.");
        return;
        }

        await logout(navigate);
    } catch (err) {
        console.error("Network error:", err);
        setShowDeleteConfirm(false);
        setError("Network error, please try again.");
    }
    };


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

                        {passwordError && <p className={styles.errorMessage}>{passwordError}</p>}

                        <button
                            className={`${styles.buttonChange} ${styles.profileButton}`}
                            onClick={handleUpdatePassword}
                            disabled={isUpdating}
                        >
                        {isUpdating ? "Updating..." : "Update Password"}
                        </button>
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
                        <ConfirmationModal
                            isOpen={showDeleteConfirm}
                            fileName="your account"
                            onConfirm={handleDeleteAccount}
                            onCancel={() => setShowDeleteConfirm(false)}
                            isTrash={false}
                            isAccount={true}
                        />
                    </div>
                    {error && <p className={styles.errorMessage}>{error}</p>}
                </div>
            </div>
        </SettingsLayout>
    );
}
