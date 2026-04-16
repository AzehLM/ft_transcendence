import { Footer } from "../components/footer";
import styles from "../styles/legal.module.css";

function TermsPage() {
    return (
        <div className={styles.wrapper}>
            <main className={styles.container}>
                <h1 className={styles.title}>Terms of Service</h1>
                <p className={styles.lastUpdated}>Last updated: April 2026</p>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 1. Acceptance of Terms</h2>
                    <p className={styles.paragraph}>
                        The present general terms of service apply in their entirety and constitute the essential and
                        crucial conditions of use of Ostrom, provided as a pedagogical project under the Association
                        42 (hereinafter referred to as « 42 »), which is a tool proposed to everyone who wants to
                        store personal data (hereinafter referred to as "the User").
                    </p>
                    <p className={styles.paragraph}>
                        The use of the website {" "}
                        <a href="https://www.ostrom.cloud" className={styles.link}>
                            ostrom.cloud
                        </a>{" "}
                        is conditioned by the full and complete acceptance by the User of the GTU outlined hereunder.
                    </p>
                    <p className={styles.paragraph}>
                        The User shall review the GTU prior to any validation of their subscription on Ostrom by
                        clicking the "Sign up" button. Clicking this button results in the acceptance and the
                        application without any objections of the GTU, which shall prevail over any conditions or
                        stipulations of the User not agreed to in writing, even when these conditions are communicated
                        subsequently to the subscription of the User.
                    </p>
                    <p className={styles.paragraph}>
                        These GTU may be amended or supplemented at any time. The User can access any such
                        modifications on this specific page. The User will be able to identify modifications via the
                        updated date of the GTU.
                    </p>
                    <p className={styles.paragraph}>
                        In any event, the present GTU remain systematically accessible by clicking on the page footer
                        link "Terms of Service", accessible from the Ostrom website.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 2. Presentation of the Service</h2>
                    <p className={styles.paragraph}>
                        Ostrom provides Users with a zero-knowledge cloud storage service, available either as a
                        private personal space or as a shared organizational space. The platform is built around a
                        zero-knowledge architecture: all files are encrypted client-side, directly in the User's
                        browser, before any data is transmitted to the server. The server exclusively stores
                        encrypted blobs and has no technical means to read, inspect, or analyze User files.
                    </p>
                    <p className={styles.paragraph}>
                        Encryption is performed using AES-GCM 256-bit encryption. The encryption key is derived
                        from the User's master password via PBKDF2 and never leaves the client device. Ostrom
                        operators therefore cannot access, recover, or reset the content of any User file.
                    </p>
                    <p className={styles.paragraph}>
                        File transfers are handled via pre-signed URLs, meaning file data is transferred directly
                        between the User's browser and object storage, without transiting through the application
                        servers.
                    </p>
                    <p className={styles.paragraph}>
                        Ostrom is provided strictly as a pedagogical project within the 42 curriculum and carries
                        no commercial guarantee of availability, durability, or service continuity.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 3. Creation of a User Account</h2>
                    <p className={styles.paragraph}>
                        Access to the Ostrom service requires the creation of a personal account. The User agrees
                        to provide accurate, complete, and up-to-date information during registration.
                    </p>
                    <p className={styles.paragraph}>
                        Upon registration, the User will be prompted to define a master password from which their
                        encryption key is derived. Due to the zero-knowledge architecture of the service, this
                        key is never transmitted to or stored by Ostrom's servers.{" "}
                        <strong>As a direct consequence, Ostrom is technically unable to reset or recover the
                        User's encryption key or the content of their files in the event of a lost password.</strong>{" "}
                        The User is solely responsible for preserving access to their credentials.
                    </p>
                    {/* <p className={styles.paragraph}>
                        The User may also enable two-factor authentication (2FA) via a TOTP-compatible application
                        (e.g. Google Authenticator). Enabling 2FA is recommended to protect account access.
                    </p> */}
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 4. Rules Relating to Passwords</h2>
                    <p className={styles.paragraph}>
                        The User is solely responsible for the confidentiality of their login credentials, including
                        their password and any two-factor authentication codes. The User undertakes not to share
                        their credentials with any third party and to notify Ostrom immediately in the event of
                        suspected unauthorized use of their account.
                    </p>
                    <p className={styles.paragraph}>
                        Passwords must meet the minimum security requirements defined at registration. Ostrom
                        recommends using a strong, unique password that is not reused across other services.
                    </p>
                    <p className={styles.paragraph}>
                        Because Ostrom employs a zero-knowledge architecture, password-based account recovery
                        will not restore access to previously encrypted files. The User acknowledges this
                        limitation as an inherent and intentional consequence of the privacy guarantees offered
                        by the service.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 5. Use of Data</h2>
                    <p className={styles.paragraph}>
                        Ostrom collects and processes only the data strictly necessary for the operation of the
                        service, including: account identifiers (email address, display name), file metadata
                        (name, size, folder hierarchy, upload date), and usage metrics (storage quota consumed).
                        File contents are encrypted client-side and are never accessible to Ostrom.
                    </p>
                    <p className={styles.paragraph}>
                        Collected data is used exclusively to provide the service, manage user accounts, enforce
                        storage quotas, and ensure the security and availability of the platform. No data is sold,
                        rented, or shared with third parties for commercial or advertising purposes.
                    </p>
                    <p className={styles.paragraph}>
                        The service may collect anonymized usage statistics (e.g. API response times, error rates)
                        via its internal monitoring infrastructure for the purpose of
                        improving performance and reliability. Such data contains no personally identifiable
                        information.
                    </p>
                    <p className={styles.paragraph}>
                        As a project operating under the 42 association framework, Ostrom does not fall under a
                        commercial data processor relationship. Users are nonetheless encouraged to review this
                        policy and contact the project team for any data-related request.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 6. Contractual Limitations on Technical Data</h2>
                    <p className={styles.paragraph}>
                        Ostrom is provided as-is, as a pedagogical and non-commercial project. The project team
                        makes no warranty, express or implied, regarding the availability, continuity, accuracy,
                        or fitness for a particular purpose of the service.
                    </p>
                    <p className={styles.paragraph}>
                        The User acknowledges that the service may be interrupted, modified, or discontinued
                        without prior notice, in particular at the end of the 42 curriculum period in which it
                        is developed.
                    </p>
                    <p className={styles.paragraph}>
                        Storage quotas are enforced per user account. The maximum quota is defined by the platform
                        and may be modified at any time. Exceeding the allocated quota will prevent further file
                        uploads until sufficient space is freed.
                    </p>
                    <p className={styles.paragraph}>
                        Due to the zero-knowledge architecture, Ostrom is unable to perform server-side content
                        scanning, virus detection, or content moderation on stored files. The User is therefore
                        solely responsible for the legality and appropriateness of any file they upload to the
                        platform.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 7. Intellectual Property</h2>
                    <p className={styles.paragraph}>
                        The Ostrom platform, including its source code, architecture, interface, and documentation,
                        is the result of collaborative work carried out within the 42 curriculum. All rights
                        relating to the platform itself are retained by its creators.
                    </p>
                    <p className={styles.paragraph}>
                        Files uploaded by Users remain the exclusive property of their respective authors. Ostrom
                        claims no rights over the content stored on the platform. By uploading a file, the User
                        warrants that they hold the necessary rights to do so and that the content does not
                        infringe any applicable law or third-party intellectual property rights.
                    </p>
                    <p className={styles.paragraph}>
                        Given the zero-knowledge architecture of the service, Ostrom has no technical ability to
                        verify the nature or legality of stored content. The User assumes full responsibility for
                        ensuring compliance with applicable intellectual property laws.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Article 8. Limitation of Liability</h2>
                    <p className={styles.paragraph}>
                        To the fullest extent permitted by applicable law, Ostrom and its contributors shall not
                        be held liable for any direct, indirect, incidental, or consequential damages arising from
                        the use or inability to use the service, including but not limited to data loss, loss of
                        access to encrypted files, unauthorized account access, or service interruption.
                    </p>
                    <p className={styles.paragraph}>
                        The User is solely responsible for maintaining backups of any data stored on the platform.
                        Ostrom does not guarantee data durability and cannot be held responsible for data loss
                        resulting from hardware failure, software errors, or account deletion.
                    </p>
                    <p className={styles.paragraph}>
                        In particular, the User expressly acknowledges that the loss of their master password
                        renders their encrypted files permanently inaccessible, and that Ostrom cannot be held
                        liable for such loss given the fundamental privacy guarantees of the zero-knowledge
                        architecture.
                    </p>
                </section>

                <hr className={styles.divider} />
            </main>
            <Footer />
        </div>
    );
}

export default TermsPage;
