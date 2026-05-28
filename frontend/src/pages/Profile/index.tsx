import { useEffect, useRef, useState } from "react";
import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "./SettingsLayout";
import { User } from "lucide-react";
import { EditableField } from "../../components/EditableField";
import { fetchWithRefresh } from "../../services/api.service";
import fieldStyles from "../../components/EditableField/EditableField.module.css"

export default function ProfilePage() {

  const [firstName, setFirstName] = useState<string>("")
  const [familyName, setFamilyName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let createdUrl: string | null = null;

    fetchWithRefresh("/api/auth/me", { signal })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then(data => {
        if (data) {
          setFirstName(data.first_name);
          setFamilyName(data.family_name);
          setEmail(data.email);
        }
      })
      .catch(err => { if (err?.name !== "AbortError") console.error("Failed to fetch user:", err); });

    fetchWithRefresh("/api/user/me/avatar", { signal })
      .then(res => {
        if (!res.ok) return null;
        return res.blob();
      })
      .then(blob => {
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setAvatarBlobUrl(createdUrl);
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
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

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setAvatarError("Only JPEG and PNG images are supported.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 4 MB.");
      return;
    }

    setAvatarError("");
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetchWithRefresh("/api/user/avatar", {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAvatarError(data.error || "Failed to upload avatar.");
        return;
      }
      const newUrl = URL.createObjectURL(file);
      setAvatarBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return newUrl;
      });
    } catch {
      setAvatarError("Failed to upload avatar.");
    }
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
                {avatarBlobUrl
                  ? <img src={avatarBlobUrl} alt="Avatar" />
                  : <div className={styles.avatarPlaceholder}><User size={44} strokeWidth={1.5} /></div>
                }
                <button
                  className={`${styles.buttonChange} ${styles.profileButton}`}
                  onClick={handleAvatarClick}
                >
                  Change Avatar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
                {avatarError && <p className={styles.errorMessage}>{avatarError}</p>}
              </div>
              <div className={styles.infoBox}>
                <EditableField
                  label="First Name"
                  value={firstName}
                  maxCharac={250}
                  onSave={handleChangeFirstName}
                  isUserNames={true}
                  handleReset={handleResetFirstName}
                ></EditableField>
                <EditableField
                  label="Family Name"
                  value={familyName}
                  maxCharac={250}
                  onSave={handleChangeFamilyName}
                  isUserNames={true}
                  handleReset={handleResetFamilyName}
                ></EditableField>
                <div className={fieldStyles.container}>
                  <p className={fieldStyles.label}>Email</p>
                  <p className={fieldStyles.readonlyValue}>{email}</p>
                </div>
              </div>
            </div>
          </div>
        </SettingsLayout>
    );
}