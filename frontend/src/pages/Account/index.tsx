import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { useState, useEffect } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { logout } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { generateChangePasswordData, generateLoginData, base64ToUint8Array, unwrapPrivateKey } from "../../services/crypto.service";
import { changePasswordSchema } from "../../schemas/auth.schema";
import { DangerZone } from "../../components/DangerZone";

export default function AccountPage() {
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [email, setEmail] = useState<string>("");
    const [pwdError, setPwdError] = useState<string | null>(null);
    const [isReset, setIsReset] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        fetchWithRefresh("/api/auth/me")
            .then(res => res.json())
            .then(data => setEmail(data.email));
    }, []);

    // Logout after password change (navigation guard)
    useEffect(() => {
        if (!isReset) return;
        const handlePopState = () => {
            sessionStorage.removeItem("passwordChanged");
            logout(navigate);
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isReset]);

    // Logout if coming back to this page after a password change
    useEffect(() => {
        if (sessionStorage.getItem("passwordChanged") === "true") {
            sessionStorage.removeItem("passwordChanged");
            logout(navigate);
        }
    }, []);

    const handleChangePassword = async () => {
        setPwdError(null);
        setIsReset(false);

        const result = changePasswordSchema.safeParse({
            current: password,        // ← doit correspondre exactement au nom dans ton schéma
            newPassword,
            confirmPassword,
        });
        if (!result.success) {
            setPwdError(result.error.issues[0].message);
            return;
        }

        setIsUpdating(true);
        try {
            const { masterKey, loginData } = await generateLoginData(email, result.data.current);
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            const responseData = await response.json();
            if (!response.ok) {
                setPwdError(responseData.message || "Current password is incorrect.");
                return;
            }

            const encryptedPrivateKey = base64ToUint8Array(responseData.encrypted_private_key);
            const iv = base64ToUint8Array(responseData.iv);
            const privateKey = await unwrapPrivateKey(encryptedPrivateKey, masterKey, iv);

            const data = await generateChangePasswordData(result.data.newPassword, privateKey);
            const passwordData = {
                old_auth_hash: loginData.auth_hash,
                new_client_salt: data.new_client_salt,
                new_auth_hash: data.new_auth_hash,
                new_encrypted_private_key: data.new_encrypted_private_key,
                new_iv: data.new_iv,
            };

            const responsePut = await fetchWithRefresh("/api/auth/password", {
                method: "PUT",
                body: JSON.stringify(passwordData),
            });

            if (!responsePut.ok) {
                const text = await responsePut.text();
                let message = "Failed to change password.";
                try {
                    if (text) {
                        const parsed = JSON.parse(text);
                        message = parsed.error || parsed.message || message;
                    }
                } catch {}
                setPwdError(message);
                setPassword("");
                setNewPassword("");
                setConfirmPassword("");
                return;
            }

            setPassword("");
            setNewPassword("");
            setConfirmPassword("");
            sessionStorage.setItem("passwordChanged", "true");
            setIsReset(true);
        } catch {
            setPwdError("Network error, please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const response = await fetchWithRefresh("/api/auth/delete", { method: "DELETE" });
            if (!response.ok) {
                const data = await response.json();
                setDeleteError(data.message || "Failed to delete account, please try again.");
                setShowDeleteConfirm(false);
                return;
            }
            await logout(navigate);
        } catch {
            setDeleteError("Network error, please try again.");
            setShowDeleteConfirm(false);
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
                        {pwdError && <p className={styles.errorMessage}>{pwdError}</p>}
                        <button
                            className={`${styles.buttonChange} ${styles.profileButton}`}
                            onClick={handleChangePassword}
                            disabled={isUpdating}
                        >
                            {isUpdating ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </div>
                <ConfirmationModal
                    isOpen={isReset}
                    fileName=""
                    onConfirm={() => logout(navigate)}
                    onCancel={() => logout(navigate)}
                    isPasswordChanged={true}
                />
                <DangerZone
                label="If you want to delete your account, click on the button"
                description="This action cannot be undone"
                buttonText="Delete Account"
                fileName="your account"
                onConfirm={handleDeleteAccount}
                isAccount={true}
                error={deleteError}
                />
            </div>
        </SettingsLayout>
    );
}
