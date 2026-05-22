import styles from "./TwoFAModal.module.css";
import { useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { QRCodeSVG } from "qrcode.react";

interface TwoFAModalProps {
    isOpen: boolean;
    isTwoFAEnabled: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type ModalStep =
    | "choice"
    | "enable-qr"
    | "enable-verify"
    | "enable-recovery"
    | "disable-password"
    | "disable-confirm";

export function TwoFAModal({
    isOpen,
    isTwoFAEnabled,
    onClose,
    onSuccess,
}: TwoFAModalProps) {
    const [step, setStep] = useState<ModalStep>("choice");
    const [qrValue, setQrValue] = useState<string>("");
    const [secret, setSecret] = useState<string>("");
    const [verificationCode, setVerificationCode] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [showCopyModal, setShowCopyModal] = useState(false);

    if (!isOpen) return null;

    const resetModal = () => {
        setStep("choice");
        setQrValue("");
        setSecret("");
        setVerificationCode("");
        setPassword("");
        setError(null);
        setLoading(false);
        setRecoveryCodes([]);
        setShowCopyModal(false);
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
            setQrValue(data.qrCodeURL);
            setSecret(data.secret);
            setStep("enable-qr");
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
            setStep("enable-recovery");
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

    const copyRecoveryCodes = () => {
        const text = recoveryCodes.join("\n");
        navigator.clipboard.writeText(text);
        setShowCopyModal(true);
        setTimeout(() => setShowCopyModal(false), 2000);
    };

    const downloadRecoveryCodes = () => {
        const text = `RECOVERY CODES - SAVE THESE IN A SAFE PLACE\n\n${recoveryCodes.join(
            "\n"
        )}\n\nIf you lose access to your authenticator, use these codes to log in.`;
        const element = document.createElement("a");
        element.setAttribute(
            "href",
            "data:text/plain;charset=utf-8," + encodeURIComponent(text)
        );
        element.setAttribute("download", "recovery-codes.txt");
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const renderChoice = () => (
        <>
            <h2 className={styles.totp_verify__title}>
                Two-Factor Authentication
            </h2>

            <p className={styles.totp_verify__description}>
                Current status: <strong>{isTwoFAEnabled ? "✓ Enabled" : "✗ Disabled"}</strong>
            </p>
            <p className={styles.totp_verify__description}>
                Two-Factor Authentication adds an extra layer of security to your account by requiring
                a code from your authenticator app in addition to your password.
            </p>

            {error && (
                <div className={styles.totp_verify__error_message}>
                    {error}
                </div>
            )}

            <div className={styles.totp_verify__actions}>
                <button
                    onClick={handleClose}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--cancel"]}`}
                >
                    Cancel
                </button>
                {isTwoFAEnabled ? (
                    <button
                        onClick={() => setStep("disable-password")}
                        className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                    >
                        Disable 2FA
                    </button>
                ) : (
                    <button
                        onClick={handleGenerateTOTP}
                        disabled={loading}
                        className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                    >
                        {loading ? "Generating..." : "Enable 2FA"}
                    </button>
                )}
            </div>
        </>
    );

    const renderEnableQR = () => (
        <>
            <h2 className={styles.totp_verify__title}>
                Enable 2FA
            </h2>

            <p className={styles.totp_verify__description}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </p>

            {qrValue && (
                <div className={styles.totp_verify__qr_code_container}>
                    <QRCodeSVG
                        value={qrValue}
                        size={256}
                        level="H"
                        includeMargin={true}
                        className={styles.totp_verify__qr_code_image}
                    />
                </div>
            )}

            {!qrValue && loading && (
                <div className={styles.totp_verify__loading_spinner}>
                    <div className={styles.totp_verify__spinner} />
                </div>
            )}

            <div className={styles.totp_verify__secret_box}>
                <span className={styles.totp_verify__secret_label}>
                    Can't scan? Enter this secret manually:
                </span>
                <div className={styles.totp_verify__secret_value}>
                    {secret}
                </div>
            </div>

            {error && (
                <div className={styles.totp_verify__error_message}>
                    {error}
                </div>
            )}

            <div className={styles.totp_verify__actions}>
                <button
                    onClick={() => setStep("choice")}
                    disabled={loading}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--cancel"]}`}
                >
                    Back
                </button>
                <button
                    onClick={() => setStep("enable-verify")}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                >
                    Next
                </button>
            </div>
        </>
    );

    const renderEnableVerify = () => (
        <>
            <h2 className={styles.totp_verify__title}>
                Verify 2FA
            </h2>

            <p className={styles.totp_verify__label}>
                Enter the 6-digit code from your authenticator app:
            </p>

            <div className={styles.totp_verify__input_group}>
                <input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setVerificationCode(value);
                        setError(null);
                    }}
                    maxLength={6}
                    className={`${styles.totp_verify__input} ${styles.totp_verify__input_code}`}
                    disabled={loading}
                />
            </div>

            {error && (
                <div className={styles.totp_verify__error_message}>
                    {error}
                </div>
            )}

            <div className={styles.totp_verify__actions}>
                <button
                    onClick={() => setStep("enable-qr")}
                    disabled={loading}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--cancel"]}`}
                >
                    Back
                </button>
                <button
                    onClick={handleVerifyTOTP}
                    disabled={verificationCode.length !== 6 || loading}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                >
                    {loading ? "Verifying..." : "Verify"}
                </button>
            </div>
        </>
    );

    const renderEnableRecovery = () => (
        <>
            <h2 className={styles.totp_verify__title}>
                Save Recovery Codes
            </h2>

            <div className={styles.totp_verify__warning_message}>
                <strong>⚠️ Important</strong>
                <p>
                    These codes will only be shown once. Save them in a safe place offline. Each code can be used once if you lose access to your authenticator.
                </p>
            </div>

            <div className={styles.totp_verify__codes_container}>
                <div className={styles.totp_verify__codes_list}>
                    {recoveryCodes.map((code, index) => (
                        <div key={index} className={styles.totp_verify__code}>
                            {code}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.totp_verify__button_group}>
                <button
                    onClick={copyRecoveryCodes}
                    className={styles.totp_verify__secondary_button}
                >
                    {showCopyModal ? "Copied!" : "Copy All"}
                </button>
                <button
                    onClick={downloadRecoveryCodes}
                    className={styles.totp_verify__secondary_button}
                >
                    Download
                </button>
            </div>

            <button
                onClick={() => {
                    resetModal();
                    onSuccess();
                }}
                className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
            >
                Complete Setup
            </button>
        </>
    );

    const renderDisablePassword = () => (
        <>
            <h2 className={styles.totp_verify__title}>
                Disable Two-Factor Authentication
            </h2>

            <p className={styles.totp_verify__label}>
                To disable 2FA, please confirm your password:
            </p>

            <div className={styles.totp_verify__input_group}>
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                    }}
                    className={styles.totp_verify__input}
                    disabled={loading}
                />
            </div>

            {error && (
                <div className={styles.totp_verify__error_message}>
                    {error}
                </div>
            )}

            <div className={styles.totp_verify__actions}>
                <button
                    onClick={() => setStep("choice")}
                    disabled={loading}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--cancel"]}`}
                >
                    Back
                </button>
                <button
                    onClick={() => setStep("disable-confirm")}
                    disabled={loading || !password}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                >
                    Continue
                </button>
            </div>
        </>
    );

    const renderDisableConfirm = () => (
        <>
            <h2 className={styles.totp_verify__title}>
                Confirm Disable 2FA
            </h2>

            <div className={styles.totp_verify__warning_message}>
                <strong>⚠️ Warning</strong>
                <p>
                    Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.
                </p>
            </div>

            {error && (
                <div className={styles.totp_verify__error_message}>
                    {error}
                </div>
            )}

            <div className={styles.totp_verify__actions}>
                <button
                    onClick={() => setStep("disable-password")}
                    disabled={loading}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--cancel"]}`}
                >
                    Back
                </button>
                <button
                    onClick={handleDisable2FA}
                    disabled={loading}
                    className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                >
                    {loading ? "Disabling..." : "Disable 2FA"}
                </button>
            </div>
        </>
    );

    return (
        <div className={styles.totp_verify__overlay} onClick={handleClose}>
            <div className={styles.totp_verify__modal} onClick={(e) => e.stopPropagation()}>
                {step === "choice" && renderChoice()}
                {step === "enable-qr" && renderEnableQR()}
                {step === "enable-verify" && renderEnableVerify()}
                {step === "enable-recovery" && renderEnableRecovery()}
                {step === "disable-password" && renderDisablePassword()}
                {step === "disable-confirm" && renderDisableConfirm()}
            </div>
        </div>
    );
}
