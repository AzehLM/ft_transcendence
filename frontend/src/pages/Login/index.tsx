import { useNavigate } from "react-router-dom";
import { generateLoginData, unwrapPrivateKey, base64ToUint8Array, storePrivateKey, storePublicKey } from "../../services/crypto.service";
import { Package, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../../styles/auth.module.css"
import { Button } from "../../components/Button";
import { InputField } from "../../components/Input";
import { loginSchema } from "../../schemas/auth.schema";
import { VerifyTOTP } from "../../components/VerifyTOTP/VerifyTOTP";


export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [show2FA, setShow2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [userEncryptedPrivateKey, setUserEncryptedPrivateKey] = useState("");
    const [userIv, setUserIv] = useState("");
    const [userPublicKey, setUserPublicKey] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            setError("Incorrect email or password");
            return;
        }

        setIsLoading(true);
        try {
            const { masterKey: mk, loginData } = await generateLoginData(result.data.email, result.data.password);

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            if (!response.ok) {
                if (response.status === 502 || response.status === 503) {
                    setError("Network error, please try again later.");
                } else {
                    const body = await response.json().catch(() => null);
                    const msg = body?.message || body?.error;
                    setError(msg ? `Login failed: ${msg}` : "Login failed!");
                }
                setIsLoading(false);
                return;
            }
            const responseData = await response.json();

            // Check if 2FA is required
            if (responseData.require_2fa) {
                // Store the necessary data for after 2FA verification
                setMasterKey(mk);
                setUserEncryptedPrivateKey(responseData.encrypted_private_key);
                setUserIv(responseData.iv);
                setUserPublicKey(responseData.public_key);
                setTempToken(responseData.temp_token);
                setShow2FA(true);
                setIsLoading(false);
                return;
            }

            // No 2FA - proceed with normal login
            localStorage.setItem("token", responseData.access_token);

            const encryptedPrivateKey = base64ToUint8Array(responseData.encrypted_private_key);
            const iv = base64ToUint8Array(responseData.iv);

            const privateKey = await unwrapPrivateKey(encryptedPrivateKey, mk, iv);
            await storePrivateKey(privateKey);

            const publicKeyArray = base64ToUint8Array(responseData.public_key);
            const publicKey = await crypto.subtle.importKey(
                "spki",
                new Uint8Array(publicKeyArray),
                { name: "RSA-OAEP", hash: "SHA-256" },
                true,
                ["encrypt"]
            );
            await storePublicKey(publicKey);

            navigate("/dashboard");
            // navigate("/profile");
        } catch (err: any) {
            setError(err.message || "An error occurred during login!");
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASuccess = async (token: string) => {
        try {
            localStorage.setItem("token", token);
            // Use the stored masterKey and encrypted data to complete login
            if (masterKey && userEncryptedPrivateKey && userIv && userPublicKey) {
                const encryptedPrivateKey = base64ToUint8Array(userEncryptedPrivateKey);
                const iv = base64ToUint8Array(userIv);

                const privateKey = await unwrapPrivateKey(encryptedPrivateKey, masterKey, iv);
                await storePrivateKey(privateKey);

                const publicKeyArray = base64ToUint8Array(userPublicKey);
                const publicKey = await crypto.subtle.importKey(
                    "spki",
                    new Uint8Array(publicKeyArray),
                    { name: "RSA-OAEP", hash: "SHA-256" },
                    true,
                    ["encrypt"]
                );
                await storePublicKey(publicKey);

                navigate("/dashboard");
            } else {
                throw new Error("Missing required data for login completion");
            }
        } catch (err: any) {
            setError(err.message || "Failed to process 2FA verification");
        }
    };

    // Show 2FA verification if required
    if (show2FA) {
        return (
                <VerifyTOTP
                    tempToken={tempToken}
                    onSuccess={handle2FASuccess}
                    onCancel={() => {
                        setShow2FA(false);
                        setTempToken("");
                        setError("");
                    }}
                />
        );
    }

    return (
        <div className={styles.login_page_wrapper} style={{ background: "linear-gradient(to bottom right, #fef9f7, white)" }}>
            <div className={styles.login_page_container} style={{ maxWidth: "448px" }}>
                {/* Logo */}
                <div className={styles.logo_section}>
                    <Link to="/" className={styles.logo_container} style={{ textDecoration: "none" }}>
                        <div className={styles.logo_box}>
                            <Package className="w-11 h-11 text-white" strokeWidth={2} />
                        </div>
                        <span className={styles.logo_title}>
                            ostrom
                        </span>
                    </Link>
                    <h1 className={styles.page_title}>
                        Welcome Back
                    </h1>
                    <p className={styles.logo_subtitle}>
                        Log in to access your secure files
                    </p>
                </div>

                {/* Login Form */}
                <div className={styles.login_form}>
                    <form className={styles.login_form_inner} onSubmit={handleSubmit}>
                        <InputField
                            label="Email Address"
                            type="email"
                            icon={Mail}
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} />

                        <InputField
                            label="Password"
                            type="password"
                            icon={Lock}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} />

                        {/* Security Notice */}
                        <div className={styles.security_notice}>
                            <Shield className={`${styles.security_notice_icon} w-5 h-5`} style={{ color: "var(--brand-primary)" }} />
                            <p className={styles.security_notice_text}>
                                <span className={styles.security_notice_title}>Secure Login:</span> Your credentials are encrypted locally before being sent to our servers. We never see your actual password.
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className={styles.error_message}>
                                {error}
                            </div>
                        )}

                        <Button type="submit" variant="primary" disabled={isLoading}>
                            {isLoading ? "Logging In..." : "Log In"}
                            <ArrowRight className="inline-block ml-2 w-5 h-5" />
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className={styles.divider}>
                        <div className={styles.divider_line}>
                            <div className={styles.divider_border}></div>
                        </div>
                        <div className={styles.divider_text_container}>
                            <span className={styles.divider_text}>
                                Don't have an account?
                            </span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <Link
                        to="/register"
                        className={styles.signup_link}
                    >
                        Create Account
                    </Link>
                </div>

                {/* Back to Home */}
                <div className={styles.back_home_container}>
                    <Link
                        to="/"
                        className={styles.back_home_link}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
