import styles from "./home.module.css";

// to be updated or deleted if we have no idea of what/who to put here
const LOGOS = ["Pierre", "Paul", "Jacques", "Michel", "Someone"];

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
