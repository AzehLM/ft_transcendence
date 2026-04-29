import { useEffect, useState } from "react";
import { getPrivateKeyFromSession } from "../../services/crypto.service";
import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "./SettingsLayout";
import avatar from './assets/temp-avatar.png';

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
const [name, setName] = useState<string>("Jean");
const [sirname, setSirname] = useState<string>("Dupont");
const [email, setEmail] = useState<string>("jeannot@gmail.com");

    return (

        <SettingsLayout>
          <div className={styles.mainBox}>
            <h2 className={styles.subtitle}>Personnal information</h2>
            <div className={styles.profileBox}>
              <div className={styles.profileAvatarCol}>
                <img src={avatar} alt="Avatar" />
                <button className={`${styles.buttonChange} ${styles.profileButton}`}>Change Avatar</button>
              </div>
              <div className={styles.infoBox}>
                <div className={styles.nameBox}>
                  <div className={styles.inputBox}>
                    <p>First Name</p>
                    <input
                      type="text"
                      value={name}
                      // onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className={styles.inputBox}>
                    <p>Last Name</p>
                    <input
                      type="text"
                      value={sirname}
                    />
                  </div>
                </div>
                <div className={styles.inputBox}>
                  <p>Email</p>
                  <input
                    type="text"
                    value={email}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.buttons}>
            <button className={`${styles.buttonChange} ${styles.profileButton}`}>Save Changes</button>
            <button className={`${styles.buttonCancel} ${styles.profileButton}`}>Cancel</button>
          </div>
          {/* <div style={{ wordBreak: "break-all", fontSize: "12px" }}>
            {privateKey ? `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----` : "Key not found"}
          </div> */}
        </SettingsLayout>
    );
}