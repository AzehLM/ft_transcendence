import styles from "../../styles/profile.module.css";

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
        <div className={styles.page}>
          <div className={styles.contentArea}>
            <h1 className={styles.title}>Settings</h1>
            <div>
                {children}
            </div>
          </div>
          {/* <div style={{ wordBreak: "break-all", fontSize: "12px" }}>
            {privateKey ? `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----` : "Key not found"}
          </div> */}
        </div>
  );
}