import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";
import { StorageBar } from "../../components/StorageBar";
import styles from "../../styles/profile.module.css"
import { DangerZone } from "../../components/DangerZone";
import { EditableField } from "../../components/EditableField";

export default function OrgSettingsPage() {

  const { id } = useParams();
  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [usedSpace, setUsedSpace] = useState<number>(0);
  const [maxSpace, setMaxSpace] = useState<number>(0);
  const navigate = useNavigate();

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
      .catch(() => setOrgName("Unknown"));
  }, [id]);


    const [error, setError] = useState<string | null>(null);

    const handleDeleteOrga = async () => {
    try {
        const response = await fetchWithRefresh(`/api/orgs/${id}`, { method: "DELETE" });
        
        if (!response.ok) {
        const data = await response.json();
        console.error("Failed to delete organization:", data);
        setError(data.message || "Failed to delete organization, please try again.");
        return;
        }
        navigate("/organizations");

    } catch (err) {
        console.error("Network error:", err);
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

  return (
    <OrgLayout title="Organization settings" orgName={orgName} orgDesc={orgDesc} showActionButtons={false}>
      <div className={styles.mainBox}>
        <h2 className={styles.subtitle}>Informations</h2>
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
      <div className={styles.mainBox}>
        <h2 className={styles.subtitle}>Storage Usage</h2>
        <StorageBar usedBytes={usedSpace} totalBytes={maxSpace} ></StorageBar>
      </div>
      { myRole === "admin" && (
        <DangerZone
        label="Delete this organization"
        description="This action cannot be undone and will remove all members."
        buttonText="Delete Organization"
        fileName={orgName}
        onConfirm={handleDeleteOrga}
        error={error}
        isDeleteOrga={true}
      /> )}
    </OrgLayout>
  );
}