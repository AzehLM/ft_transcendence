import styles from "./TwoFAModal.module.css";
import { useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";

interface TwoFAModalProps {
    isOpen: boolean;
    isTwoFAEnabled: boolean;
    onClose: () => void;
    onSuccess: () => void;
    email: string;
}

type ModalStep = "choice" | "enable-setup" | "enable-verify" | "disable-password" | "disable-confirm";

export function TwoFAModal({
    isOpen,
    isTwoFAEnabled,
    onClose,
    onSuccess,
    email,
}: TwoFAModalProps) {
    const [step, setStep] = useState<ModalStep>("choice");
    const [qrCodeURL, setQrCodeURL] = useState<string>("");
    const [secret, setSecret] = useState<string>("");
    const [verificationCode, setVerificationCode] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [recoveryCodesVisible, setRecoveryCodesVisible] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

    if (!isOpen) return null;

    const resetModal = () => {
        setStep("choice");
        setQrCodeURL("");
        setSecret("");
        setVerificationCode("");
        setPassword("");
        setError(null);
        setLoading(false);
        setRecoveryCodesVisible(false);
        setRecoveryCodes([]);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const handleGenerateTOTP = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithRefresh("/api/auth/2fa/totp/generate", {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || "Failed to generate TOTP");
                setLoading(false);
                return;
            }

            const data = await response.json();
            setQrCodeURL(data.qrCodeURL);
            setSecret(data.secret);
            setStep("enable-verify");
        } catch (err) {
            console.error("Error generating TOTP:", err);
            setError("Network error, please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTOTP = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError("Please enter a valid 6-digit code");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithRefresh("/api/auth/2fa/totp/verify", {
                method: "POST",
                body: JSON.stringify({ code: verificationCode }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || "Failed to verify code");
                setLoading(false);
                return;
            }

            const data = await response.json();
            setRecoveryCodes(data.recoveryCodes);
            setRecoveryCodesVisible(true);
            setStep("enable-setup");
        } catch (err) {
            console.error("Error verifying TOTP:", err);
            setError("Network error, please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!password) {
            setError("Please enter your password");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithRefresh("/api/auth/2fa/disable", {
                method: "POST",
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || "Failed to disable 2FA");
                setLoading(false);
                return;
            }

            resetModal();
            onSuccess();
        } catch (err) {
            console.error("Error disabling 2FA:", err);
            setError("Network error, please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert("Copied to clipboard!");
        });
    };

    const renderChoice = () => (
        <div>
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Two-Factor Authentication</h3>
            </div>
            <div className={styles.modalBody}>
                <p className={styles.description}>
                    Two-Factor Authentication (2FA) adds an extra layer of security to your account by requiring
                    a code from your authenticator app in addition to your password.
                </p>
                <p className={styles.description}>
                    Current status: <strong>{isTwoFAEnabled ? "✓ Enabled" : "✗ Disabled"}</strong>
                </p>
            </div>
            <div className={styles.buttonsContainer}>
                <button className={styles.secondaryButton} onClick={handleClose}>
                    Cancel
                </button>
                {isTwoFAEnabled ? (
                    <button
                        className={styles.dangerButton}
                        onClick={() => setStep("disable-password")}
                    >
                        Disable 2FA
                    </button>
                ) : (
                    <button
                        className={styles.primaryButton}
                        onClick={() => setStep("enable-setup")}
                    >
                        Enable 2FA
                    </button>
                )}
            </div>
        </div>
    );

    const renderEnableSetup = () => (
        <div>
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Enable Two-Factor Authentication</h3>
            </div>
            <div className={styles.modalBody}>
                {!recoveryCodesVisible ? (
                    <>
                        <p className={styles.description}>
                            To enable 2FA, you'll need an authenticator app. We recommend:
                        </p>
                        <ul className={styles.stepsList}>
                            <li className={styles.stepItem}>Google Authenticator</li>
                            <li className={styles.stepItem}>Microsoft Authenticator</li>
                            <li className={styles.stepItem}>Authy</li>
                            <li className={styles.stepItem}>Any TOTP-compatible app</li>
                        </ul>

                        {qrCodeURL ? (
                            <>
                                <p className={styles.description} style={{ marginTop: "1rem" }}>
                                    Scan this QR code with your authenticator app:
                                </p>
                                <div className={styles.qrContainer}>
                                    <img
                                        src={qrCodeURL}
                                        alt="QR Code for 2FA setup"
                                        className={styles.qrImage}
                                    />
                                </div>
                                <p className={styles.description} style={{ fontSize: "0.85rem", color: "#999" }}>
                                    Can't scan? Enter this secret manually:
                                </p>
                                <div className={styles.secretKey}>
                                    <span className={styles.secretLabel}>Secret Key</span>
                                    {secret}
                                </div>
                                <div className={styles.inputBox}>
                                    <label className={styles.inputLabel}>
                                        Enter the 6-digit code from your authenticator app:
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={verificationCode}
                                        onChange={(e) => {
                                            setVerificationCode(e.target.value.replace(/\D/g, ""));
                                            setError(null);
                                        }}
                                        className={styles.inputField}
                                        disabled={loading}
                                    />
                                </div>
                                {error && <p className={styles.errorMessage}>{error}</p>}
                                <div className={styles.buttonsContainer}>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => {
                                            setStep("choice");
                                            setQrCodeURL("");
                                            setSecret("");
                                            setVerificationCode("");
                                            setError(null);
                                        }}
                                        disabled={loading}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className={styles.primaryButton}
                                        onClick={handleVerifyTOTP}
                                        disabled={loading || verificationCode.length !== 6}
                                    >
                                        {loading ? <span className={styles.spinner} /> : "Verify Code"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {error && <p className={styles.errorMessage}>{error}</p>}
                                <div className={styles.buttonsContainer}>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => setStep("choice")}
                                        disabled={loading}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className={styles.primaryButton}
                                        onClick={handleGenerateTOTP}
                                        disabled={loading}
                                    >
                                        {loading ? <span className={styles.spinner} /> : "Generate QR Code"}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <p className={styles.successMessage}>
                            ✓ 2FA has been successfully enabled!
                        </p>
                        <p className={styles.description}>
                            Save these 10 recovery codes in a safe place. You can use them to access your account
                            if you lose access to your authenticator app.
                        </p>
                        <div className={styles.recoveryCodesContainer}>
                            <div className={styles.recoveryCodesList}>
                                {recoveryCodes.map((code, index) => (
                                    <div key={index} className={styles.recoveryCode}>
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            className={styles.copyButton}
                            onClick={() => copyToClipboard(recoveryCodes.join("\n"))}
                        >
                            Copy All Codes
                        </button>
                        <p className={styles.warningMessage} style={{ marginTop: "1rem" }}>
                            ⚠️ These codes are shown only once. Save them now or you won't be able to recover them.
                        </p>
                        <div className={styles.buttonsContainer} style={{ marginTop: "1.5rem" }}>
                            <button className={styles.primaryButton} onClick={handleClose}>
                                Done
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderDisablePassword = () => (
        <div>
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Disable Two-Factor Authentication</h3>
            </div>
            <div className={styles.modalBody}>
                <p className={styles.description}>
                    To disable 2FA, please confirm your password:
                </p>
                <div className={styles.inputBox}>
                    <label className={styles.inputLabel}>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError(null);
                        }}
                        className={styles.inputField}
                        disabled={loading}
                    />
                </div>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <div className={styles.buttonsContainer}>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => {
                            setStep("choice");
                            setPassword("");
                            setError(null);
                        }}
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        className={styles.dangerButton}
                        onClick={() => setStep("disable-confirm")}
                        disabled={loading || !password}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );

    const renderDisableConfirm = () => (
        <div>
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Confirm Disable 2FA</h3>
            </div>
            <div className={styles.modalBody}>
                <p className={styles.description}>
                    Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.
                </p>
                <p className={styles.description}>
                    This action cannot be undone. You'll need to enable 2FA again if you change your mind.
                </p>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <div className={styles.buttonsContainer}>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => {
                            setStep("disable-password");
                            setError(null);
                        }}
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        className={styles.dangerButton}
                        onClick={handleDisable2FA}
                        disabled={loading}
                    >
                        {loading ? <span className={styles.spinner} /> : "Disable 2FA"}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                {step === "choice" && renderChoice()}
                {step === "enable-setup" && renderEnableSetup()}
                {step === "disable-password" && renderDisablePassword()}
                {step === "disable-confirm" && renderDisableConfirm()}
            </div>
        </div>
    );
}
