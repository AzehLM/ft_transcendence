import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { logout } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";
import { DangerZone } from "../../components/DangerZone";
import { generateChangePasswordData, generateLoginData, base64ToUint8Array, unwrapPrivateKey } from "../../services/crypto.service";
import { useEffect } from "react";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { changePasswordSchema } from "../../schemas/auth.schema";


export default function AccountPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isReset, setIsReset] = useState(false);

    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdError, setPwdError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const [email, setEmail] = useState<string>("");

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

    const handleDeleteAccount = async () => {
        try {
            const response = await fetchWithRefresh("/api/auth/me", { method: "DELETE" });

            if (!response.ok) {
            const text = await response.text();
            let message = "Failed to delete account, please try again.";
            try {
                if (text) {
                const data = JSON.parse(text);
                message = data.message || data.error || message;
                }
            } catch {}
            setError(message);
            return;
            }

            await logout(navigate);
        } catch (err) {
            console.error("Failed to delete account:", err);
            if (err instanceof TypeError) {
                setError("Network error, please try again.");
            } else if (err instanceof SyntaxError) {
                setError("Received an invalid server response. Please try again.");
            } else {
                setError("Failed to delete account. Please try again.");
            }
        }
    };

    const handleChangePassword = async () => {
        setPwdError(null);
        setIsReset(false);

        const result = changePasswordSchema.safeParse({
            current: password,
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
                setPwdError(responseData.message || "Current password is incorrect." /* previously "Error."*/);
                return;
            }

            const encryptedPrivateKey = base64ToUint8Array(responseData.encrypted_private_key);
            const iv = base64ToUint8Array(responseData.iv);
            const privateKey = await unwrapPrivateKey(encryptedPrivateKey, masterKey, iv, true);

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
                        const data = JSON.parse(text);
                        message = data.error || data.message || message;
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
            setPwdError(null);
            sessionStorage.setItem("passwordChanged", "true");
            setIsReset(true);

        } catch (err) {
            console.error("Failed to change password:", err);
            if (err instanceof TypeError) {
                setPwdError("Network error, please try again.");
            } else if (err instanceof SyntaxError) {
                setPwdError("Received an invalid server response. Please try again.");
            } else {
                setPwdError("Failed to change password. Please try again.");
            }
        } finally {
            setIsUpdating(false);
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
                    onConfirm={() => setIsReset(false)}
                    onCancel={() => setIsReset(false)}
                    isPasswordChanged={true}
                />
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
