import { Shield, X } from "lucide-react";
import styles from "./TwoFAPrompt.module.css";

interface TwoFAPromptProps {
    onEnable: () => void;
    onSkip: () => void;
}

export function TwoFAPrompt({ onEnable, onSkip }: TwoFAPromptProps) {
    return (
        <div className={styles.prompt_overlay}>
            <div className={styles.prompt_modal}>
                <button
                    onClick={onSkip}
                    className={styles.prompt_close}
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className={styles.prompt_icon}>
                    <Shield className="w-12 h-12" />
                </div>

                <h2 className={styles.prompt_title}>
                    Enable Two-Factor Authentication?
                </h2>

                <p className={styles.prompt_description}>
                    Protect your account with an extra layer of security. Two-factor authentication requires a code from your phone to log in.
                </p>

                <div className={styles.prompt_benefits}>
                    <div className={styles.benefit_item}>
                        <span className={styles.benefit_icon}>🔒</span>
                        <span>Extra security layer</span>
                    </div>
                    <div className={styles.benefit_item}>
                        <span className={styles.benefit_icon}>⏱️</span>
                        <span>Time-based verification</span>
                    </div>
                    <div className={styles.benefit_item}>
                        <span className={styles.benefit_icon}>📱</span>
                        <span>Use any authenticator app</span>
                    </div>
                </div>

                <div className={styles.prompt_actions}>
                    <button
                        onClick={onSkip}
                        className={`${styles.prompt_button} ${styles["prompt_button--secondary"]}`}
                    >
                        Skip for Now
                    </button>
                    <button
                        onClick={onEnable}
                        className={`${styles.prompt_button} ${styles["prompt_button--primary"]}`}
                    >
                        Enable 2FA
                    </button>
                </div>

                <p className={styles.prompt_footer}>
                    You can enable this later in your account settings
                </p>
            </div>
        </div>
    );
}
