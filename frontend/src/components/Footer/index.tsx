import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./Footer.module.css";

const FOOTER_COLUMNS = [
    {
        title: "Resources",
        links: [
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
            { label: "Status", to: "/status"},
        ],
    },
    {
        title: "About",
        links: [
            { label: "Who we are", to: "/about" },
        ],
    },
];

export function Footer({ hasSidebar = false }: { hasSidebar?: boolean }) {
    const [hasSidebarInDOM, setHasSidebarInDOM] = useState(false);

    useEffect(() => {
        const checkSidebar = () => {
            const sidebar = document.querySelector('[class*="sidebar"]');
            setHasSidebarInDOM(!!sidebar);
        };

        checkSidebar();

        const observer = new MutationObserver(checkSidebar);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    const shouldHaveSidebarMargin = hasSidebar || hasSidebarInDOM;

    return (
        <footer className={`${styles.footer} ${shouldHaveSidebarMargin ? styles.footerWithSidebar : ''}`}>
            <div className={styles.footerGrid}>
                {/* Brand */}
                <div>
                    <Link to="/">
                        <div className={styles.footerBrand}>Ostrom</div>
                    </Link>
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
            </div><div className={styles.footerBottom}>
                <p className={styles.footerCopyright}>
                    © 2026 Ostrom. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
