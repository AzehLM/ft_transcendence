import { useEffect, useState } from "react";
import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "./SettingsLayout";
import avatar from './assets/temp-avatar.png';
import { EditableField } from "../../components/EditableField";
import { fetchWithRefresh } from "../../services/api.service";
import fieldStyles from "../../components/EditableField/EditableField.module.css"

export default function ProfilePage() {

  const [firstName, setFirstName] = useState<string>("")
  const [familyName, setFamilyName] = useState<string>("")
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    let cancelled = false;

    fetchWithRefresh("/api/auth/me")
      .then(res => {
        // navigate to 404 if not found ?
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then(data => {
        if (!cancelled && data) {
          setFirstName(data.first_name);
          setFamilyName(data.family_name);
          setEmail(data.email);
        }
      })
      .catch(err => {
        if (!cancelled) console.error("Failed to fetch user:", err);
      });

    return () => { cancelled = true; };
  }, []);

  const handleChangeFirstName = async (newFirstName: string) => {
    const response = await fetchWithRefresh(`/api/auth/first-name`, {
      method: "PATCH",
      body: JSON.stringify({first_name: newFirstName}),
    });
    if (!response.ok) throw new Error("Failed to change first name");
    setFirstName(newFirstName)
  };

  const handleResetFirstName = async () => {
    const response = await fetchWithRefresh(`/api/auth/first-name`, {
      method: "PATCH",
      body: JSON.stringify({ first_name: "" }),
    });
    if (!response.ok) throw new Error("Failed to change first name.");
    setFirstName("");
  };

  const handleChangeFamilyName = async (newFamilyName: string) => {
    const response = await fetchWithRefresh(`/api/auth/family-name`, {
      method: "PATCH",
      body: JSON.stringify({family_name: newFamilyName}),
    });
    if (!response.ok) throw new Error("Failed to change family name");
    setFamilyName(newFamilyName)
  };

  const handleResetFamilyName = async () => {
    const response = await fetchWithRefresh(`/api/auth/family-name`, {
      method: "PATCH",
      body: JSON.stringify({ family_name: "" }),
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
                  onSave={handleChangeFirstName}
                  isFirstName={true}
                  handleReset={handleResetFirstName}
                ></EditableField>
                <EditableField
                  label="Family Name"
                  value={familyName}
                  onSave={handleChangeFamilyName}
                  isFamilyName={true}
                  handleReset={handleResetFamilyName}
                ></EditableField>
                <div className={fieldStyles.container}>
                  <p className={fieldStyles.label}>Email</p>
                  <p className={fieldStyles.value}>{email}</p>
                </div>
              </div>
            </div>
          </div>
        </SettingsLayout>
    );
}
