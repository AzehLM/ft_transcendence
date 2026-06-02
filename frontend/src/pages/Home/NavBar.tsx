import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProfileDropdown } from "../../components/ProfileDropdown";
import { UserProfileButton } from "../../components/UserProfileButton";
import { useHomeAuth } from "./useHomeAuth";
import styles from "./home.module.css";

const NAV_LINKS = [
    { label: "Features", target: "features" },
    { label: "About", target: "about" },
];

function scrollTo(targetId: string, onDone?: () => void) {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
        onDone?.();
    };
}

function useActiveSection(ids: string[]): string | null {
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const observers = ids.map((id) => {
            const el = document.getElementById(id);
            if (!el) return null;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveId(id);
                },
                {
                    rootMargin: "-20% 0px -60% 0px",
                    threshold: 0,
                }
            );

            observer.observe(el);
            return observer;
        });

        return () => {
            observers.forEach((obs, i) => {
                const el = document.getElementById(ids[i]);
                if (obs && el) obs.unobserve(el);
            });
        };
    }, []);

    return activeId;
}

export function NavBar() {
    const { user } = useHomeAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const activeSection = useActiveSection(NAV_LINKS.map((l) => l.target));

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setMenuOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <header className={styles.navbar}>
            <nav className={styles.navbar__inner}>
                <Link to="/" className={styles.navbar__logo}>
                    <img src="/app-icon.png" alt="Ostrom logo" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                    Ostrom
                </Link>

                <div className={styles.navbar__links}>
                    {NAV_LINKS.map(({ label, target }) => (
                        <a
                            key={label}
                            href={`#${target}`}
                            onClick={scrollTo(target)}
                            className={`${styles.navbar__link} ${
                                activeSection === target ? styles["navbar__link--active"] : ""
                            }`}
                        >
                            {label}
                        </a>
                    ))}
                </div>

                <div className={styles.navbar__desktop_actions}>
                    {user ? (
                        <div className={`${styles.navbar__actions} ${styles["navbar__actions--loggedin"]}`}>
                            <div style={{ position: "relative" }}>
                                <UserProfileButton
                                    isOpen={dropdownOpen}
                                    onClick={() => setDropdownOpen((o) => !o)}
                                />
                                <ProfileDropdown
                                    isOpen={dropdownOpen}
                                    onClose={() => setDropdownOpen(false)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className={styles.navbar__actions}>
                            <Link to="/login" className={styles["navbar__link--login"]}>
                                Log In
                            </Link>
                            <Link to="/register" className={styles["navbar__link--signup"]}>
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile only */}
                <button
                    className={styles.navbar__hamburger}
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                >
                    <span className={`${styles.navbar__hamburger__line} ${menuOpen ? styles["navbar__hamburger__line--top-open"] : ""}`} />
                    <span className={`${styles.navbar__hamburger__line} ${menuOpen ? styles["navbar__hamburger__line--mid-open"] : ""}`} />
                    <span className={`${styles.navbar__hamburger__line} ${menuOpen ? styles["navbar__hamburger__line--bot-open"] : ""}`} />
                </button>
            </nav>

            {/* Mobile drawer */}
            {menuOpen && (
                <div className={styles.navbar__mobile_menu}>
                    {NAV_LINKS.map(({ label, target }) => (
                        <a
                            key={label}
                            href={`#${target}`}
                            onClick={scrollTo(target, () => setMenuOpen(false))}
                            className={`${styles.navbar__mobile_link} ${
                                activeSection === target ? styles["navbar__mobile_link--active"] : ""
                            }`}
                        >
                            {label}
                        </a>
                    ))}
                    {user ? (
                        <Link to="/dashboard" className={styles.navbar__mobile_link} onClick={() => setMenuOpen(false)}>
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className={styles.navbar__mobile_link} onClick={() => setMenuOpen(false)}>
                                Log In
                            </Link>
                            <Link to="/register" className={styles["navbar__mobile_link--cta"]} onClick={() => setMenuOpen(false)}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
