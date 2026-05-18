import { Link } from "react-router-dom";
import styles from "./home.module.css";

export function HeroSection() {
    return (
        <section className={styles.hero}>
            <div className={styles.hero__inner}>
                {/* Text */}
                <div className={styles.hero__text}>
                    <h1 className={styles.hero__title}>
                        Your Data,{" "}
                        <br />
                        <span className={styles.hero__title__accent}>Your Control.</span>
                        <br />
                        Securely Shared.
                    </h1>

                    <p className={styles.hero__description}>
                        Zero-knowledge, client-side encryption. Secure storage you can
                        truly trust. Even we can't read your data. Inspired by Elinor
                        Ostrom's work on governing shared resources.
                    </p>

                    <div className={styles.hero__cta}>
                        <Link to="/register" className={styles.hero__btn}>
                            Get Started
                        </Link>
                    </div>
                </div>

                {/* Visual */}
                <div className={styles.hero__visual}>
                    <div className={styles.hero__visual__halo} />
                    <div className={styles.hero__visual__card}>
                        <video
                            className={styles.hero__visual__video}
                            src="/videos/lock-video.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
