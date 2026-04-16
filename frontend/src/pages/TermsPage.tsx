import { Footer } from "../components/footer";
import styles from "../styles/legal.module.css";

function TermsPage() {
    return (
        <div className={styles.wrapper}>
            <main className={styles.container}>
                <h1 className={styles.title}>Terms of Service</h1>
                <p className={styles.lastUpdated}>Last updated: April 2026</p>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 1. Acceptance of Terms</h2>
                    <p className={styles.paragraph}>The present general terms of service apply in their entirety and constitute the essential and crucial conditions of use of Ostrom, provided as a pedagogical project under the Association 42 (hereinafter referred to as « 42 »), which is a tool proposed to everyone who want to store personal files.</p>
                    <p className={styles.paragraph}>The use of the website {" "}
                        <a href="https://www.ostrom.cloud" className={styles.link}>
                            ostrom.cloud
                        </a>{" "} is conditioned by the full and complete acceptance by the User of the GTU outlined hereunder</p>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 2. Presentation of the service</h2>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 3. Creation of a user account</h2>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 4. Rules relating to passwords</h2>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 5. Use of data</h2>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 6. Contractual Limitations on technical data</h2>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 7. Intellectual property</h2>
                </section>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Acticle 8. Contractual Limitations on technical data</h2>
                    <p className={styles.paragraph}>something something something something something something something something something something something something something something something something something something something something something something something something something something something something something something something something </p>
                </section>
                <hr className={styles.divider} />
            </main>
            <Footer />
        </div>
    );
}

export default TermsPage
