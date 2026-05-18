import styles from "./home.module.css";

export function Features() {
    return (
        <section id="features" className={styles.features}>
            <div className={styles.features__inner}>
                <div className={styles.features__header}>
                    <h2 className={styles.features__title}>
                        Designed for Collective Security
                    </h2>
                    <p className={styles.features__subtitle}>
                        We apply Nobel-winning principles to the digital commons.
                    </p>
                </div>

                <div className={styles.features__grid}>
                    {/* Feature 1 — large card*/}
                    <div className={styles["features__card--large"]}>
                        <div className={styles.features__card__icon}>
                            <svg
                                width="52"
                                height="52"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#de7356"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div className={styles.features__card__body}>
                            <h3 className={styles.features__card__title}>
                                Client-Side Encryption
                            </h3>
                            <p className={styles.features__card__description}>
                                Files are encrypted in your browser before they leave your
                                device. Your data is converted into noise before it even hits
                                our network.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2 — small card */}
                    <div className={styles["features__card--small"]}>
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="#fff"
                        >
                            <path
                                d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                                stroke="#fff"
                                fill="none"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div>
                            <h3 className={styles["features__card__title--light"]}>
                                Zero-Knowledge Storage
                            </h3>
                            <p className={styles["features__card__description--light"]}>
                                Our servers have no access to your decryption keys. We store
                                data we can't decode, ensuring total privacy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
