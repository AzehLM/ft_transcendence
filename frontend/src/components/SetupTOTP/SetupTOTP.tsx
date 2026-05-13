import { useState, useEffect } from "react";
import { generateTOTPSecret, verifyTOTPSetup } from "../../services/totp.service";
import styles from "./SetupTOTP.module.css";

interface SetupTOTPProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function SetupTOTP({ onSuccess, onCancel }: SetupTOTPProps) {
    const [step, setStep] = useState<"qr" | "verify" | "recovery">("qr");
    const [qrCode, setQrCode] = useState<string>("");
    const [secret, setSecret] = useState<string>("");
    const [verificationCode, setVerificationCode] = useState<string>("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [showCopyModal, setShowCopyModal] = useState<boolean>(false);

    // Step 1: Generate QR Code
    useEffect(() => {
        const generateQR = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await generateTOTPSecret();
                setQrCode(data.qrCode);
                setSecret(data.secret);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to generate QR code"
                );
            } finally {
                setLoading(false);
            }
        };

        generateQR();
    }, []);

    // Step 2: Verify Setup
    const handleVerifyCode = async () => {
        if (verificationCode.length !== 6) {
            setError("Code must be 6 digits");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const data = await verifyTOTPSetup(verificationCode);
            setRecoveryCodes(data.recoveryCodes);
            setStep("recovery");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid verification code");
            setVerificationCode("");
        } finally {
            setLoading(false);
        }
    };

    // Copy recovery codes
    const copyRecoveryCodes = () => {
        const text = recoveryCodes.join("\n");
        navigator.clipboard.writeText(text);
        setShowCopyModal(true);
        setTimeout(() => setShowCopyModal(false), 2000);
    };

    // Download recovery codes
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

    const handleComplete = () => {
        if (onSuccess) {
            onSuccess();
        }
    };

    return (
        <div className={styles.totp_setup__overlay}>
            <div className={styles.totp_setup__modal}>
                {/* QR Code Step */}
                {step === "qr" && (
                    <>
                        <h2 className={styles.totp_setup__title}>
                            Enable 2FA
                        </h2>

                        <div>
                            <p className={styles.totp_setup__description}>
                                Scan this QR code with your authenticator app (Google
                                Authenticator, Authy, Microsoft Authenticator, etc.)
                            </p>

                            {qrCode && (
                                <div className={styles.totp_setup__qr_code_container}>
                                    <img
                                        src={qrCode}
                                        alt="TOTP QR Code"
                                        className={styles.totp_setup__qr_code_image}
                                    />
                                </div>
                            )}

                            {!qrCode && loading && (
                                <div className={styles.totp_setup__loading_spinner}>
                                    <div className={styles.totp_setup__spinner} />
                                </div>
                            )}
                        </div>

                        {/* Manual Secret Option */}
                        <div className={styles.totp_setup__secret_box}>
                            <label className={styles.totp_setup__secret_label}>
                                Can't scan? Enter this secret manually:
                            </label>
                            <div className={styles.totp_setup__secret_value}>
                                {secret}
                            </div>
                        </div>

                        {error && (
                            <div className={styles.totp_setup__error_message}>
                                {error}
                            </div>
                        )}

                        <div className={styles.totp_setup__actions}>
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className={`${styles.totp_setup__action_button} ${styles["totp_setup__action_button--cancel"]}`}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => setStep("verify")}
                                className={`${styles.totp_setup__action_button} ${styles["totp_setup__action_button--primary"]}`}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}

                {/* Verify Code Step */}
                {step === "verify" && (
                    <>
                        <h2 className={styles.totp_setup__title}>
                            Verify 2FA
                        </h2>

                        <p className={styles.totp_setup__description}>
                            Enter the 6-digit code from your authenticator app:
                        </p>

                        <div className={styles.totp_setup__input_group}>
                            <input
                                type="text"
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                    setVerificationCode(value);
                                }}
                                maxLength={6}
                                className={styles.totp_setup__input}
                            />
                        </div>

                        {error && (
                            <div className={styles.totp_setup__error_message}>
                                {error}
                            </div>
                        )}

                        <div className={styles.totp_setup__actions}>
                            <button
                                onClick={() => setStep("qr")}
                                className={`${styles.totp_setup__action_button} ${styles["totp_setup__action_button--cancel"]}`}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleVerifyCode}
                                disabled={verificationCode.length !== 6 || loading}
                                className={`${styles.totp_setup__action_button} ${styles["totp_setup__action_button--primary"]}`}
                            >
                                {loading ? "Verifying..." : "Verify"}
                            </button>
                        </div>
                    </>
                )}

                {/* Recovery Codes Step */}
                {step === "recovery" && (
                    <>
                        <h2 className={styles.totp_setup__title}>
                            Save Recovery Codes
                        </h2>

                        <div className={styles.totp_setup__warning_box}>
                            <p className={styles.totp_setup__warning_title}>
                                ⚠️ Important
                            </p>
                            <p className={styles.totp_setup__warning_text}>
                                These codes will only be shown once. Save them in a safe place offline. Each code can be used once if you lose access to your authenticator.
                            </p>
                        </div>

                        <div className={styles.totp_setup__codes_container}>
                            <div className={styles.totp_setup__codes_list}>
                                {recoveryCodes.map((code, index) => (
                                    <div
                                        key={index}
                                        className={styles.totp_setup__code}
                                    >
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.totp_setup__button_group}>
                            <button
                                onClick={copyRecoveryCodes}
                                className={`${styles.totp_setup__secondary_button} ${styles["totp_setup__secondary_button--secondary"]}`}
                            >
                                {showCopyModal ? "Copied!" : "Copy All"}
                            </button>
                            <button
                                onClick={downloadRecoveryCodes}
                                className={`${styles.totp_setup__secondary_button} ${styles["totp_setup__secondary_button--secondary"]}`}
                            >
                                Download
                            </button>
                        </div>

                        <button
                            onClick={handleComplete}
                            className={`${styles.totp_setup__action_button} ${styles["totp_setup__action_button--primary"]}`}
                        >
                            Complete Setup
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
