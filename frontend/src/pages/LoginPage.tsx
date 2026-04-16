import { useNavigate } from "react-router-dom";
import { generateLoginData } from "../services/crypto.service";
import { Package, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/auth.module.css"
import { Button } from "../components/button";
import { InputField } from "../components/input";
import { Footer } from "../components/footer";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("All fields are required!");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email!");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters!");
            return;
        }

        setIsLoading(true);
        try {
            console.log("🔐 Génération des données cryptographiques pour la connexion...");
            const loginData = await generateLoginData(email, password);

            console.log("📤 Envoi au serveur...");
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || "Login failed!");
                setIsLoading(false);
                return;
            }

            console.log("✅ Connexion réussie!");
            const data = await response.json()
            localStorage.setItem("token", data.access_token);
            // navigate("/dashboard");
            navigate("/profile");

        } catch (err: any) {
            console.error("❌ Erreur:", err);
            setError(err.message || "An error occurred during login!");
            setIsLoading(false);
        }
    };

    return (
        <>
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
            <div>
                <Footer />
            </div>
        </>
    );
}
