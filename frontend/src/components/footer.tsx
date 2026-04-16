import { Link } from "react-router-dom";
import styles from "../styles/components.module.css";

const FOOTER_COLUMNS = [
    {
        title: "Resources",
        links: [
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
        ],
    },
    {
        title: "About",
        links: [
            { label: "Who we are", to: "/about" },
        ],
    },
];

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerGrid}>
                {/* Brand */}
                <div>
                    <div className={styles.footerBrand}>Ostrom</div>
                    <p className={styles.footerTagline}>
                        Securing digital exchange.
                    </p>
                </div>

                {/* Columns */}
                {FOOTER_COLUMNS.map(({ title, links }) => (
                    <div key={title}>
                        <span className={styles.footerColumnTitle}>{title}</span>
                        <nav className={styles.footerNav}>
                            {links.map(({ label, to }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={styles.footerLink}
                                >
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                ))}
            </div>

            <div className={styles.footerBottom}>
                <p className={styles.footerCopyright}>
                    © 2026 Ostrom. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
