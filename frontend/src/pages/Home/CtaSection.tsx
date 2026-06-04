import { Link } from "react-router-dom";
import styles from "./home.module.css";

export function CtaSection() {
    return (
        <section id="about" className={styles.cta}>
            <div className={styles.cta__card}>
                <video
                    className={styles.cta__video}
                    src="/videos/cta-background.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
                <div className={styles.cta__overlay} />
                <div className={styles.cta__content}>
                    <h2 className={styles.cta__title}>
                        Take Control of Your Digital Sovereignty Today.
                    </h2>
                    <p className={styles.cta__description}>
                        Join organizations securing their most sensitive data with Ostrom's
                        zero-knowledge infrastructure.
                    </p>
                    <Link to="/register" className={styles.cta__btn}>
                        Sign Up Now
                    </Link>
                </div>
            </div>
        </section>
    );
}
