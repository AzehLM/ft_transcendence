import { useEffect, useState } from "react";
// import { getPrivateKeyFromSession } from "../../services/crypto.service";
import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "./SettingsLayout";
import avatar from './assets/temp-avatar.png';
import { EditableField } from "../../components/EditableField";
import { fetchWithRefresh } from "../../services/api.service";
import fieldStyles from "../../components/EditableField/EditableField.module.css"

export default function ProfilePage() {
//   const [privateKey, setPrivateKey] = useState<string | null>(null);

// useEffect(() => {
//   const init = async () => {
//     const key = await getPrivateKeyFromSession();
//     if (!key) return;
//     const exported = await crypto.subtle.exportKey("pkcs8", key);
//     const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
//     setPrivateKey(base64);
//   };
//   init();

// }, []);
// const [name] = useState<string>("Jean");
// const [sirname] = useState<string>("Dupont");
// const [email] = useState<string>("jeannot@gmail.com");

  const [firstName, setFirstName] = useState<string>("")
  const [familyName, setFamilyName] = useState<string>("")
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    fetchWithRefresh(`/api/auth/me`)
      .then(res => {
        // navigate to 404 if not found ?
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json()
      })
      .then(data => {
        if (data) {
          setFirstName(data.first_name);
          setFamilyName(data.family_name);
          setEmail(data.email);
        }
      })
  });

  const handleChangeFirstName = async (newFirstName: string) => {
    const response = await fetchWithRefresh(`/api/auth/first-name`, {
      method: "PATCH",
      body: JSON.stringify({firstName: newFirstName}),
    });
    if (!response.ok) throw new Error("Failed to change first name");
    setFirstName(newFirstName)
  };

  const handleResetFirstName = async () => {
    const response = await fetchWithRefresh(`/api/auth/first-name`, {
      method: "PATCH",
      body: JSON.stringify({ description: "" }),
    });
    if (!response.ok) throw new Error("Failed to change first name.");
    setFirstName("");
  };

  const handleChangeFamilyName = async (newFamilyName: string) => {
    const response = await fetchWithRefresh(`/api/auth/family-name`, {
      method: "PATCH",
      body: JSON.stringify({familyName: newFamilyName}),
    });
    if (!response.ok) throw new Error("Failed to change family name");
    setFirstName(newFamilyName)
  };

  const handleResetFamilyName = async () => {
    const response = await fetchWithRefresh(`/api/auth/family-name`, {
      method: "PATCH",
      body: JSON.stringify({ description: "" }),
    });
    if (!response.ok) throw new Error("Failed to change family name.");
    setFamilyName("");
  };

    return (

        <SettingsLayout>
          <div className={styles.mainBox}>
            <h2 className={styles.subtitle}>Personal information</h2>
            <div className={styles.profileBox}>
              <div className={styles.profileAvatarCol}>
                <img src={avatar} alt="Avatar" />
                <button className={`${styles.buttonChange} ${styles.profileButton}`}>Change Avatar</button>
              </div>
              <div className={styles.infoBox}>
                <EditableField
                  label="First Name"
                  value={firstName}
                  maxCarac={250}
                  onSave={handleChangeFirstName}
                  isUserNames={true}
                  handleReset={handleResetFirstName}
                ></EditableField>
                <EditableField
                  label="Family Name"
                  value={familyName}
                  maxCarac={250}
                  onSave={handleChangeFamilyName}
                  isUserNames={true}
                  handleReset={handleResetFamilyName}
                ></EditableField>
                <div className={fieldStyles.container}>
                  <p className={fieldStyles.label}>Email</p>
                  <p className={fieldStyles.value}>{email}</p>
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