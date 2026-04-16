import { Footer } from "../components/footer";
import styles from "../styles/legal.module.css";

function PrivacyPage() {
    return (
        <div className={styles.wrapper}>
            <main className={styles.container}>
                <h1 className={styles.title}>Privacy Policy</h1>
                <p className={styles.lastUpdated}>Last updated: April 2026</p>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 1. Introduction</h2>
                    <p className={styles.paragraph}>
                        Ostrom is a pedagogical project developed within the 42 curriculum. This Privacy Policy
                        describes how Ostrom collects, uses, and protects information relating to its Users when
                        they access and use the service available at{" "}
                        <a href="https://www.ostrom.cloud" className={styles.link}>
                            ostrom.cloud
                        </a>.
                    </p>
                    <p className={styles.paragraph}>
                        Ostrom is built around a zero-knowledge architecture: all files are encrypted client-side
                        before leaving the User's browser. As a direct consequence, Ostrom has no technical ability
                        to access, read, or analyze the content of any file stored on the platform. This policy
                        therefore applies exclusively to the metadata and account data that Ostrom does handle.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 2. Data We Collect</h2>
                    <p className={styles.paragraph}>
                        Ostrom collects only the data strictly necessary to provide the service:
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Account data</strong> — email address, display name, hashed password, and
                        optionally a two-factor authentication configuration. This data is required to create
                        and authenticate a User account.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>File metadata</strong> — file name, size, upload date, folder hierarchy, and
                        encryption parameters (encrypted key, initialization vector). File contents are
                        encrypted client-side and are never accessible to Ostrom.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Usage data</strong> — storage quota consumed per account. This is used solely
                        to enforce per-user storage limits.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Technical data</strong> — anonymized performance metrics (API response times,
                        error rates) collected via internal monitoring tools. This data
                        contains no personally identifiable information and is used exclusively to maintain
                        platform reliability.
                    </p>
                    <p className={styles.paragraph}>
                        Ostrom does not collect browsing history, device fingerprints, advertising identifiers,
                        or any data unrelated to the operation of the service.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 3. How We Use Your Data</h2>
                    <p className={styles.paragraph}>
                        The data collected by Ostrom is used exclusively for the following purposes:
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Account management</strong> — creating, authenticating, and maintaining User
                        accounts, including two-factor authentication when enabled.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Service operation</strong> — managing file storage, folder hierarchies,
                        organization memberships, and access control.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Quota enforcement</strong> — tracking storage usage to prevent accounts from
                        exceeding their allocated space.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Platform monitoring</strong> — ensuring the availability and performance of
                        the service through anonymized technical metrics.
                    </p>
                    <p className={styles.paragraph}>
                        Ostrom does not use personal data for advertising, profiling, or any commercial purpose.
                        No data is sold or shared with third parties.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 4. Zero-Knowledge Architecture & File Privacy</h2>
                    <p className={styles.paragraph}>
                        Ostrom is designed so that the platform operators can never access User file contents.
                        Encryption is performed entirely in the User's browser using AES-GCM 256-bit encryption.
                        The encryption key is derived from the User's master password via PBKDF2 and never
                        leaves the client device.
                    </p>
                    <p className={styles.paragraph}>
                        The server stores only encrypted binary objects alongside their metadata. It is
                        technically impossible for Ostrom to decrypt, read, or recover these files, including
                        in response to a legal request.
                    </p>
                    <p className={styles.paragraph}>
                        As a consequence of this architecture, Ostrom is also unable to perform server-side
                        virus scanning or content moderation. The User is solely responsible for the legality
                        of the files they store on the platform.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 5. Data Retention</h2>
                    <p className={styles.paragraph}>
                        Account data and associated file metadata are retained for as long as the User's account
                        remains active. Upon account deletion, all associated metadata and encrypted file objects
                        stored in the object storage layer are permanently deleted.
                    </p>
                    <p className={styles.paragraph}>
                        Because file contents are encrypted client-side and Ostrom holds no decryption keys,
                        deleted encrypted blobs are irrecoverable by design.
                    </p>
                    <p className={styles.paragraph}>
                        Anonymized technical metrics collected for monitoring purposes do not contain personal
                        data and are retained independently of account lifecycle.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 6. Data Sharing & Third Parties</h2>
                    <p className={styles.paragraph}>
                        Ostrom does not sell, rent, or share personal data with any third party for commercial
                        purposes. No advertising networks, analytics providers, or data brokers have access
                        to User data.
                    </p>
                    <p className={styles.paragraph}>
                        File storage is handled by a self-hosted MinIO instance operated as part of the Ostrom
                        infrastructure. No data is transferred to external cloud providers.
                    </p>
                    <p className={styles.paragraph}>
                        As a pedagogical project, Ostrom is not subject to commercial data processing agreements.
                        However, the project team is committed to handling User data responsibly and in accordance
                        with the principles set out in this policy.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 7. User Rights</h2>
                    <p className={styles.paragraph}>
                        Users may request access to, correction of, or deletion of their personal account data
                        at any time by contacting the project team or by deleting their account directly from
                        the platform settings.
                    </p>
                    <p className={styles.paragraph}>
                        Due to the zero-knowledge architecture, Ostrom cannot provide access to or recovery of
                        file contents, as these are encrypted with keys that never leave the User's device.
                        Only file metadata (name, size, upload date) can be accessed or deleted through a
                        data request.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 8. Cookies & Local Storage</h2>
                    <p className={styles.paragraph}>
                        Ostrom uses HTTP-only cookies exclusively for session management and authentication
                        (JWT tokens). These cookies are strictly necessary for the operation of the service
                        and are not used for tracking or advertising purposes.
                    </p>
                    <p className={styles.paragraph}>
                        No third-party cookies, tracking pixels, or analytics scripts are present on the
                        platform. The User's browser local storage may be used to temporarily hold
                        cryptographic material (derived keys) for the duration of a session. This data
                        never leaves the client device.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 9. Changes to This Policy</h2>
                    <p className={styles.paragraph}>
                        This Privacy Policy may be updated at any time. The date of the latest revision is
                        indicated at the top of this page. Continued use of the service following any update
                        constitutes acceptance of the revised policy.
                    </p>
                    <p className={styles.paragraph}>
                        This policy is permanently accessible via the "Privacy Policy" link in the Ostrom
                        website footer.
                    </p>
                </section>

                <hr className={styles.divider} />
            </main>
            <Footer />
        </div>
    );
}

export default PrivacyPage;
