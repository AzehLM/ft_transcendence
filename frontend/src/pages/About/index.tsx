import { Shield, Cpu, Lock, GraduationCap, FolderLock } from "lucide-react";
import styles from "../../styles/legal.module.css";
import BackToHomeLink from "../../components/BackToHomeLink";

function AboutPage() {
    return (
        <div className={styles.wrapper}>
            <main className={styles.container} style={{ paddingBottom: "80px" }}>
                <BackToHomeLink />


                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "24px"
                }}>
                    <img src="/app-icon.png" alt="" aria-hidden="true" style={{ width: "52px", height: "52px", objectFit: "contain" }} />

                    <div>
                        <h1 className={styles.title} style={{ margin: 0, fontSize: "32px", fontFamily: "IBM Plex Sans, sans-serif" }}>
                            About Ostrom
                        </h1>
                        <p className={styles.lastUpdated} style={{ margin: 0 }}>
                            A secure, Zero-Knowledge, E2EE cloud storage system
                        </p>
                    </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #e5dbd9", margin: "32px 0" }} />

                {/* Who we are */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <GraduationCap size={22} style={{ color: "#865142" }} /> Who we are
                    </h2>
                    <p className={styles.paragraph} style={{ fontSize: "15px", lineHeight: "1.8" }}>
                        We are four students from school 42 who met during the common core and decided to build something we actually cared about for our final capstone. Different backgrounds, different specializations, but a shared belief that privacy in the cloud shouldn't be a premium feature.
                    </p>

                    {/* Team member bubbles*/}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "20px",
                        marginTop: "32px"
                    }}>
                        {[
                            {
                                name: "Guillaume Ebersohl",
                                description: "Technical Lead",
                                bio: "Economics grad to events pro to obsessive coder : Guillaume is basically Mr. Robot in disguise. He digs deep into every subject and spends so much time at school 42 that his ghost probably haunts the place when he's away.",
                                photo: "/members/gueberso.jpeg"
                            },
                            {
                                name: "Victoire Perrier",
                                description: "Project Manager",
                                bio: "From digital marketing to software engineering, Victoire brought a user-first mindset that kept the product grounded when the engineering got deep. You'll probably find her singing at the top of her lungs in her alone time.",
                                photo: "/members/vicperri.jpeg"
                            },
                            {
                                name: "Pierrick Naessen",
                                description: "Product Owner",
                                bio: "From Calais, Pierrick traded cinema studies for a keyboard at 42 and quickly became one of its most valued contributors. When he's not helping a fellow student, he's probably perfecting his skincare routine or buying new shoes.",
                                photo: "/members/pnaessen.jpeg"
                            },
                            {
                                name: "Lou-Anne Buisson",
                                description: "Project Manager",
                                bio: "From events management to software development at 42, Lou-Anne brings the kind of rigour that only comes from years of getting things done under pressure. When she's not at her desk, she's probably mid-hike somewhere.",
                                photo: "/members/lbuisson.jpeg"
                            },
                        ].map((member) => (
                            <div key={member.name} style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "14px",
                                padding: "24px 16px",
                                borderRadius: "16px",
                                textAlign: "center",
                            }}>
                                <div style={{
                                    width: "180px",
                                    height: "180px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: "3px solid #ebdcd9",
                                    backgroundColor: "#f0e6e3",
                                    flexShrink: 0
                                }}>
                                    <img
                                        src={member.photo}
                                        alt={member.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                </div>
                                <div>
                                    <p style={{ margin: "0 0 5px 0", fontWeight: 600, fontSize: "15px", color: "#2b1008", fontFamily: "IBM Plex Sans, sans-serif" }}>
                                        {member.name}
                                    </p>
                                    <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#865142", lineHeight: "1.5" }}>
                                        {member.description}
                                    </p>
                                    <hr style={{ border: "none", borderTop: "1px solid #ebdcd9", margin: "0 0 12px 0" }} />
                                    <p style={{ margin: 0, fontSize: "13px", color: "#2b1008", lineHeight: "1.65", opacity: 0.6, textAlign: "justify" }}>
                                        {member.bio}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>


                {/* The project */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <FolderLock size={22} style={{ color: "#865142" }} /> The Project
                    </h2>
                    <p className={styles.paragraph} style={{ fontSize: "15px", lineHeight: "1.8" }}>
                        Ostrom is not a commercial product. We are a team of four student developers at school 42, and this application is our final graduation capstone. We set out to build a fully functional, production-ready, and end-to-end encrypted (E2EE) file storage system.
                    </p>
                    <p className={styles.paragraph} style={{ fontSize: "15px", lineHeight: "1.8" }}>
                        Inspired by Elinor Ostrom's Nobel-prize-winning work on how communities successfully govern shared resources (the "commons") without centralized state or private control, we wanted to build a cloud storage service where users hold absolute sovereignty over their own data.
                    </p>
                </section>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "24px",
                    margin: "40px 0"
                }}>
                    {/* Pillar 1: Zero-Knowledge */}
                    <div style={{
                        backgroundColor: "#fefdfc",
                        border: "1px solid #ebdcd9",
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.02)"
                    }}>
                        <div style={{ color: "#d54f2a", marginBottom: "16px" }}>
                            <Lock size={28} />
                        </div>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#2b1008", fontWeight: 600 }}>
                            Zero-Knowledge
                        </h3>
                        <p className={styles.paragraph} style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
                            The server never has access to your decryption keys or original file names. Everything is encrypted directly in your browser.
                        </p>
                    </div>

                    {/* Pillar 2: Cryptography */}
                    <div style={{
                        backgroundColor: "#fefdfc",
                        border: "1px solid #ebdcd9",
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.02)"
                    }}>
                        <div style={{ color: "#d54f2a", marginBottom: "16px" }}>
                            <Shield size={28} />
                        </div>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#2b1008", fontWeight: 600 }}>
                            Client-Side E2EE
                        </h3>
                        <p className={styles.paragraph} style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
                            Symmetric encryption by chunks using AES-GCM (256-bit), combined with asymmetric session key packaging using RSA-OAEP (2048-bit).
                        </p>
                    </div>

                    {/* Pillar 3: Microservices */}
                    <div style={{
                        backgroundColor: "#fefdfc",
                        border: "1px solid #ebdcd9",
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.02)"
                    }}>
                        <div style={{ color: "#d54f2a", marginBottom: "16px" }}>
                            <Cpu size={28} />
                        </div>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#2b1008", fontWeight: 600 }}>
                            Go Microservices
                        </h3>
                        <p className={styles.paragraph} style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
                            Decoupled backend services in Go (Auth, Orga, Storage) communicating as a workspace, built for raw execution speed and scalability.
                        </p>
                    </div>
                </div>

                {/* Cryptographic Details */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <Shield size={22} style={{ color: "#865142" }} /> Zero-Knowledge Mechanics
                    </h2>
                    <p className={styles.paragraph}>
                        Most cloud providers claim your data is safe, yet they hold the keys to decrypt it on their servers. Ostrom is architected differently:
                    </p>
                    <p className={styles.paragraph}>
                        When you select a file, it is divided into 5MB chunks and encrypted locally in your browser. The Data Encryption Key (DEK) generated for each file is wrapped using your RSA public key.
                    </p>
                    <p className={styles.paragraph}>
                        To prevent keys from being vulnerable to theft (such as through XSS injections in the browser), we leverage the browser's native Web Cryptography API to import and store keys as non-extractable objects within IndexedDB. The raw private key bytes never touch the Javascript memory space after import and can never be exported or stolen by raw scripts.
                    </p>
                </section>

                {/* Engineering Stack */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <Cpu size={22} style={{ color: "#865142" }} /> Under the Hood: The Stack
                    </h2>
                    <p className={styles.paragraph}>
                        Instead of building a simple single-server CRUD application, we decided to challenge ourselves with a distributed architecture:
                    </p>
                    <ul className={styles.list}>
                        <li className={styles.listItem}>
                            <strong>Go Multi-Module Workspace</strong>: Backend microservices built in Go (Fiber API), delivering minimal latency and highly concurrent handling of uploads.
                        </li>
                        <li className={styles.listItem}>
                            <strong>Object Storage & Metadata Separation</strong>: Raw encrypted bytes are uploaded directly to a self-hosted MinIO cluster. Relational metadata, folder structures, and wrapped keys are isolated in a PostgreSQL 18 database.
                        </li>
                        <li className={styles.listItem}>
                            <strong>Event Infrastructure</strong>: We utilize Redis in two ways: Pub/Sub over WebSockets for instant frontend UI updates, and Redis Streams as a durable event queue for background workers (e.g. sweeping orphaned data, cleaning deleted accounts).
                        </li>
                        <li className={styles.listItem}>
                            <strong>Observability</strong>: A complete monitoring suite using Prometheus & Grafana to track memory consumption, database queries, network latencies, and storage quotas in real time.
                        </li>
                        <li className={styles.listItem}>
                            <strong>Edge Gateway</strong>: A Caddy reverse proxy acting as the single front door, handling automated TLS termination and secure headers.
                        </li>
                    </ul>
                </section>

                {/* 42 Capstone Card */}
                <section className={styles.section} style={{
                    backgroundColor: "#faf5f4",
                    border: "1px solid #ebdcd9",
                    borderRadius: "16px",
                    padding: "24px",
                    marginTop: "40px"
                }}>
                    <h2 className={styles.sectionTitle} style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px", margin: 0, color: "#865142" }}>
                        <GraduationCap size={24} /> School 42 Capstone Project
                    </h2>
                    <p className={styles.paragraph} style={{ marginTop: "12px", marginBottom: 0, fontSize: "14px", lineHeight: "1.7" }}>
                        This project represents the culmination of our common core curriculum and specializations at <strong>school 42</strong>. It demonstrates our ability to design, develop, secure, and deploy a complex web application with total creative freedom, following industry-standard software engineering best practices.
                    </p>
                </section>
            </main>
        </div>
    );
}

export default AboutPage;
