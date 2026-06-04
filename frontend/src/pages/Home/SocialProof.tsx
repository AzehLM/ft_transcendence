import styles from "./home.module.css";

const LOGOS = ["Julian Assange", "Edward Snowden", "Chelsea Manning", "Boston Globe", "John Doe"];

export function SocialProof() {
    return (
        <section className={styles.socialProof}>
            <div className={styles.socialProof__inner}>
                <p className={styles.socialProof__label}>
                    {/* need something more catchy  */}
                    Trusted by people we don't even know of
                </p>
                <div className={styles.socialProof__logos}>
                    {LOGOS.map((logo) => (
                        <div key={logo} className={styles.socialProof__logo}>
                            {logo}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
