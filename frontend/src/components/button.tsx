import styles from "../styles/LoginPage.module.css"

export function Button({ children, variant = "primary", className = "", type = "button" }: { children: React.ReactNode; variant?: "primary" | "secondary"; className?: string; type?: "button" | "submit" }) {
    const buttonClass = type === "submit" ? styles.submit_button : "";

    const primaryStyles = {
        backgroundColor: "var(--brand-primary)",
        color: "white"
    };

    const secondaryStyles = {
        backgroundColor: "var(--brand-light)",
        color: "var(--brand-dark)"
    };

    const variantStyle = variant === "primary" ? primaryStyles : secondaryStyles;

    return (
        <button
            type={type}
            className={`${buttonClass} ${className}`}
            style={variantStyle}
            onMouseEnter={(e) => {
                if (variant === "primary") {
                    e.currentTarget.style.backgroundColor = "var(--brand-primary-hover)";
                }
            }}
            onMouseLeave={(e) => {
                if (variant === "primary") {
                    e.currentTarget.style.backgroundColor = "var(--brand-primary)";
                }
            }}
        >
            {children}
        </button>
    );
}

