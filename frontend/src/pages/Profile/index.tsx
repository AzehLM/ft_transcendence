import { useEffect, useState } from "react";
import { getPrivateKeyFromSession } from "../../services/crypto.service";
import styles from "./Profile.module.css";


export default function ProfilePage() {
  const [privateKey, setPrivateKey] = useState<string | null>(null);

useEffect(() => {
  const init = async () => {
    const key = await getPrivateKeyFromSession();
    if (!key) return;
    const exported = await crypto.subtle.exportKey("pkcs8", key);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    setPrivateKey(base64);
  };
  init();
}, []);

    return (

        <div className={styles.page}>
          <h2>profile</h2>
          <div style={{ wordBreak: "break-all", fontSize: "12px" }}>
            {privateKey ? `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----` : "Key not found"}
          </div>
        </div>
    )
}