import styles from "../styles/LoginPage.module.css"

export function Button({ children, variant = "primary", className = "", type = "button" }: { children: React.ReactNode; variant?: "primary" | "secondary"; className?: string; type?: "button" | "submit" }) {
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

