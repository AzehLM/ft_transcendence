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
    const [pwdError, setPwdError] = useState<string | null>(null);
    const [isReset, setIsReset] = useState(false);

    const [email, setEmail] = useState<string>("");

    useEffect(() => {
    fetchWithRefresh("/api/auth/me")
        .then(res => res.json())
        .then(data => setEmail(data.email));
    }, []);

    const handleChangePassword = async () => {
    setPwdError(null);
    setIsReset(false);
    console.log(password, " --- ", newPassword, " --- ", confirmPassword);
    if (!password || !newPassword || !confirmPassword) {
        setPwdError("All fields are required!");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        return;
    }
    if (newPassword !== confirmPassword) {
        setPwdError("The new passwords do not match.");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        return;
    }

    if (newPassword.length < 8) {
        setPwdError("Password must be at least 8 characters!");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        return;
    }

    if (newPassword === password) {
        setPwdError("New password cannot be the same as the previous one.");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        return;
    }
    try {

        const { masterKey, loginData } = await generateLoginData(email, password);
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });

        const responseData = await response.json();

        if (!response.ok) {
            setPwdError(responseData.message || "Error !");
            return;
        }


        const encryptedPrivateKey = base64ToUint8Array(responseData.encrypted_private_key);
        const iv = base64ToUint8Array(responseData.iv);

        const privateKey = await unwrapPrivateKey(encryptedPrivateKey, masterKey, iv);

        const data = await generateChangePasswordData(newPassword, privateKey);
        const passwordData = {
            old_auth_hash: loginData.auth_hash,
            new_client_salt: data.new_client_salt,
            new_auth_hash: data.new_auth_hash,
            new_encrypted_private_key: data.new_encrypted_private_key,
            new_iv: data.new_iv,
        };
        console.log("Send to change password : ", passwordData);
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

    } catch {
        setPwdError("Network error, please try again.");
    }
    };

    useEffect(() => {
        if (!isReset) return;

        const handlePopState = () => {
        sessionStorage.removeItem("passwordChanged");
        logout(navigate);
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isReset]);

    useEffect(() => {
        if (sessionStorage.getItem("passwordChanged") === "true") {
        sessionStorage.removeItem("passwordChanged");
        logout(navigate);
        }
    }, []);

    useEffect(() => {
    if (!isReset) return;

    const handlePopState = () => {
        sessionStorage.removeItem("passwordChanged");
        logout(navigate);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    }, [isReset]);

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
                        <button className={`${styles.buttonChange} ${styles.profileButton}`}
                            onClick={handleChangePassword}
                        >Update Password</button>
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
                error={error}
                />
            </div>
        </SettingsLayout>
    );
}