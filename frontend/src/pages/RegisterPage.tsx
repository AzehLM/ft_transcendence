import { useNavigate } from "react-router-dom";
import { generateRegistrationData } from "../services/crypto.service";
import { Package, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/auth.module.css"
import { Button } from "../components/button";
import { InputField } from "../components/input";


export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");  // Réinitialise les erreurs précédentes

        if (!email || !password || !confirmPassword) {
            setError("All fields are required!");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email!");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters!");
            return;
        }


        setIsLoading(true);
        try {
            console.log("🔐 Génération des données cryptographiques...");
            const registrationData = await generateRegistrationData(email, password);
            
            console.log("📤 Envoi au serveur...");
            const response = await fetch("/api/auth/register", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(registrationData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || "Registration failed!");
                setIsLoading(false);
                return;
            }

            console.log("✅ Enregistrement réussi!");
            navigate("/login");

        } catch (err: any) {
            console.error("❌ Erreur:", err);
            setError(err.message || "An error occurred during registration!");
            setIsLoading(false);
        }
    };

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
                            ft_box
                        </span>
                    </Link>
                    <h1 style={{ fontSize: "40px", fontWeight: "bold", color: "var(--brand-dark)", marginBottom: "12px" }}>
                        Create Your Account
                    </h1>
                    <p className={styles.logo_subtitle}>
                        Start protecting your files with zero-knowledge encryption
                    </p>
                </div>

                {/* Registration Form */}
                <div className={styles.login_form}>
                    <form className={styles.login_form_inner} onSubmit={handleSubmit}>
                        <InputField
                            label="Email Address"
                            type="email"
                            icon={Mail}
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            type="password"
                            icon={Lock}
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <InputField
                            label="Confirm Password"
                            type="password"
                            icon={Lock}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        {/* Security Notice */}
                        <div className={styles.security_notice}>
                            <Shield className={`${styles.security_notice_icon} w-5 h-5`} style={{ color: "var(--brand-primary)" }} />
                            <p className={styles.security_notice_text}>
                                <span className={styles.security_notice_title}>Important:</span> Your password cannot be recovered. Make sure to store it securely—we cannot reset it for you due to our zero-knowledge architecture.
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className={styles.error_message}>
                                {error}
                            </div>
                        )}

                        <Button type="submit" variant="primary" disabled={isLoading}>
                            {isLoading ? "Creating Account..." : "Create Account"}
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
                                Already have an account?
                            </span>
                        </div>
                    </div>

                    {/* Login Link */}
                    <Link
                        to="/login"
                        className={styles.signup_link}
                    >
                        Log In
                    </Link>
                </div>

                {/* Terms and Privacy */}
                <div style={{ marginTop: "32px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "var(--brand-dark)", opacity: 0.7, lineHeight: 1.6 }}>
                        By signing up, you agree to our{" "}
                        <Link
                            to="/terms"
                            style={{ color: "var(--brand-primary)", textDecoration: "none" }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Terms of Service
                        </Link>
                        {" "}and{" "}
                        <Link
                            to="/privacy"
                            style={{ color: "var(--brand-primary)", textDecoration: "none" }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}