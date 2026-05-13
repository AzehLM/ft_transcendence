import { useState } from "react";
import {
    verifyTOTPLogin,
    verifyRecoveryCode,
} from "../../services/totp.service";
import styles from "./VerifyTOTP.module.css";

interface VerifyTOTPProps {
    tempToken: string;
    onSuccess: (token: string) => void;
    onCancel?: () => void;
}

export function VerifyTOTP({
    tempToken,
    onSuccess,
    onCancel,
}: VerifyTOTPProps) {
    const [method, setMethod] = useState<"totp" | "recovery">("totp");
    const [code, setCode] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [remainingCodes, setRemainingCodes] = useState<number | null>(null);

    const handleVerifyTOTP = async () => {
        if (code.length !== 6) {
            setError("Code must be 6 digits");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const data = await verifyTOTPLogin(code, tempToken);
            localStorage.setItem("token", data.token);
            onSuccess(data.token);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid code");
            setCode("");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyRecovery = async () => {
        if (!code) {
            setError("Recovery code is required");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const data = await verifyRecoveryCode(code, tempToken);
            localStorage.setItem("token", data.token);
            setRemainingCodes(data.remaining);

            // Show warning and complete
            if (data.warning) {
                console.warn(data.warning);
            }

            onSuccess(data.token);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid recovery code");
            setCode("");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = () => {
        if (method === "totp") {
            handleVerifyTOTP();
        } else {
            handleVerifyRecovery();
        }
    };

    return (
        <div className={styles.totp_verify__overlay}>
            <div className={styles.totp_verify__modal}>
                <h2 className={styles.totp_verify__title}>
                    Two-Factor Authentication
                </h2>

                {/* Method Selection */}
                <div className={styles.totp_verify__method_buttons}>
                    <button
                        onClick={() => {
                            setMethod("totp");
                            setCode("");
                            setError("");
                        }}
                        className={`${styles.totp_verify__method_button} ${method === "totp" ? styles["totp_verify__method_button--active"] : styles["totp_verify__method_button--inactive"]}`}
                    >
                        Authenticator
                    </button>
                    <button
                        onClick={() => {
                            setMethod("recovery");
                            setCode("");
                            setError("");
                        }}
                        className={`${styles.totp_verify__method_button} ${method === "recovery" ? styles["totp_verify__method_button--active"] : styles["totp_verify__method_button--inactive"]}`}
                    >
                        Recovery Code
                    </button>
                </div>

                {/* TOTP Input */}
                {method === "totp" && (
                    <div className={styles.totp_verify__input_group}>
                        <label className={styles.totp_verify__label}>
                            Enter 6-digit code from your authenticator app
                        </label>
                        <input
                            type="text"
                            placeholder="000000"
                            value={code}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                setCode(value);
                            }}
                            maxLength={6}
                            className={`${styles.totp_verify__input} ${styles.totp_verify__input_code}`}
                            disabled={loading}
                        />
                        <p className={styles.totp_verify__hint}>
                            This code changes every 30 seconds
                        </p>
                    </div>
                )}

                {/* Recovery Code Input */}
                {method === "recovery" && (
                    <div className={styles.totp_verify__input_group}>
                        <label className={styles.totp_verify__label}>
                            Enter a recovery code (e.g. ABC-123-DEF)
                        </label>
                        <input
                            type="text"
                            placeholder="ABC-123-DEF"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            disabled={loading}
                            className={styles.totp_verify__input}
                        />
                        <p className={styles.totp_verify__hint}>
                            Each code can only be used once
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className={styles.totp_verify__error_message}>
                        {error}
                    </div>
                )}

                {/* Warning for remaining codes */}
                {remainingCodes !== null && remainingCodes < 3 && (
                    <div className={styles.totp_verify__warning_message}>
                        ⚠️ You have {remainingCodes} recovery code(s) left. Generate new ones soon.
                    </div>
                )}

                {/* Actions */}
                <div className={styles.totp_verify__actions}>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--cancel"]}`}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleVerify}
                        disabled={
                            (method === "totp" && code.length !== 6) ||
                            (method === "recovery" && !code) ||
                            loading
                        }
                        className={`${styles.totp_verify__action_button} ${styles["totp_verify__action_button--primary"]}`}
                    >
                        {loading ? "Verifying..." : "Verify"}
                    </button>
                </div>
            </div>
        </div>
    );
}
