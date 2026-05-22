import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams, useNavigate } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";
import { StorageBar } from "../../components/StorageBar";
import styles from "./OrgSettings.module.css";
import { DangerZone } from "../../components/DangerZone";
import { EditableField } from "../../components/EditableField";

export default function OrgSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [usedSpace, setUsedSpace] = useState<number>(0);
  const [maxSpace, setMaxSpace] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (res.status === 404 || res.status === 400) {
          navigate("/404");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch org.");
        return res.json();
      })
      .then(data => {
        if (data) {
          setOrgName(data.name);
          setMyRole(data.role);
          setUsedSpace(data.used_space);
          setMaxSpace(data.max_space);
          setOrgDesc(data.description);
        }
      })
      .catch(() => setOrgName("Unknown"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDeleteOrga = async () => {
    try {
      const response = await fetchWithRefresh(`/api/orgs/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to delete organization, please try again.");
        return;
      }
      navigate("/organizations");
    } catch (err) {
      setError("Network error, please try again.");
    }
  };

  const handleRenameOrg = async (newName: string) => {
    const response = await fetchWithRefresh(`/api/orgs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) throw new Error("Failed to rename.");
    setOrgName(newName);
  };

  const handleChangeDescription = async (newDescription: string) => {
    const response = await fetchWithRefresh(`/api/orgs/${id}/members/me/description`, {
      method: "PATCH",
      body: JSON.stringify({ description: newDescription }),
    });
    if (!response.ok) throw new Error("Failed to change description.");
    setOrgDesc(newDescription);
  };

  const handleResetDescription = async () => {
    const response = await fetchWithRefresh(`/api/orgs/${id}/members/me/description`, {
      method: "PATCH",
      body: JSON.stringify({ description: "" }),
    });
    if (!response.ok) throw new Error("Failed to change description.");
    setOrgDesc("");
  };

  if (loading) {
    return (
      <OrgLayout orgName={orgName} orgDesc={orgDesc}>
        <div className={styles.container}>
           <div className={styles.sectionCard}>
             <p className={styles.subtitle}>Loading settings...</p>
           </div>
        </div>
      </OrgLayout>
    );
  }

  return (
      <OrgLayout orgName={orgName} orgDesc={orgDesc}>
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <h1>Organization Settings</h1>
          <p className={styles.subtitle}>Manage your organization details and storage</p>
        </div>

        <div className={styles.settingsGrid}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>General Information</h2>
            <div className={styles.fieldGroup}>
              <EditableField
                label="Organization name"
                value={orgName}
                role={myRole}
                maxCharac={100}
                onSave={handleRenameOrg}
                isOrgaName={true}
              />
              <EditableField
                label="Organization description"
                value={orgDesc}
                role={myRole}
                maxCharac={250}
                onSave={handleChangeDescription}
                handleReset={handleResetDescription}
                isOrgaDesc={true}
              />
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Storage Usage</h2>
            <StorageBar usedBytes={usedSpace} totalBytes={maxSpace} />
          </div>

          {myRole === "admin" && (
            <DangerZone
              label="Delete this organization"
              description="This action cannot be undone and will remove all members, files, and folders associated with this organization."
              buttonText="Delete Organization"
              fileName={orgName}
              onConfirm={handleDeleteOrga}
              error={error ?? undefined}
              isDeleteOrga={true}
            />
          )}
        </div>
      </div>
    </OrgLayout>
  );
}