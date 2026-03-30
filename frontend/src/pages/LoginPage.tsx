import { Package, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/LoginPage.module.css"

function Button({ children, variant = "primary", className = "", type = "button" }: { children: React.ReactNode; variant?: "primary" | "secondary"; className?: string; type?: "button" | "submit" }) {
    const variantStyles = variant === "primary"
        ? "bg-[#de7356] text-white hover:bg-[#d16649]"
        : "bg-[rgba(230,225,224,0.71)] text-[#2b1008] hover:bg-[rgba(230,225,224,0.9)]";

    const buttonClass = type === "submit" ? styles.submit_button : "";

    return (
        <button type={type} className={`${buttonClass} ${variantStyles} ${className}`}>
            {children}
        </button>
    );
}

function InputField({
    label,
    type = "text",
    icon: Icon,
    placeholder,
    value,
    onChange
}: {
    label: string;
    type?: string;
    icon: any;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className={styles.input_field_wrapper}>
            <label className={styles.input_label}>
                {label}
            </label>
            <div className={styles.input_container}>
                <div className={styles.input_icon}>
                    <Icon className="w-6 h-6" />
                </div>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={styles.input_field}
                />
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle login logic here
        console.log("Login:", { email, password });
    };

    return (
        <div className={styles.login_page_wrapper} style={{ background: "linear-gradient(to bottom right, #fef9f7, white)" }}>
            <div className={styles.login_page_container} style={{ maxWidth: "448px" }}>
                {/* Logo */}
                <div className={styles.logo_section}>
                    <div className={styles.logo_container}>
                        <div className={styles.logo_box}>
                            <Package className="w-11 h-11 text-white" strokeWidth={2} />
                        </div>
                        <span className={styles.logo_title}>
                            ft_box
                        </span>
                    </div>
                    <h1 style={{ fontSize: "40px", fontWeight: "bold", color: "#2b1008", marginBottom: "12px" }}>
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
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            type="password"
                            icon={Lock}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {/* Forgot Password Link */}
                        <div className={styles.forgot_password}>
                            <a href="#">
                                Forgot password?
                            </a>
                        </div>

                        {/* Security Notice */}
                        <div className={styles.security_notice}>
                            <Shield className={`${styles.security_notice_icon} w-5 h-5 text-[#de7356]`} />
                            <p className={styles.security_notice_text}>
                                <span className={styles.security_notice_title}>Secure Login:</span> Your credentials are encrypted locally before being sent to our servers. We never see your actual password.
                            </p>
                        </div>

                        <Button type="submit" variant="primary">
                            Log In
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
                        to="/signup"
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