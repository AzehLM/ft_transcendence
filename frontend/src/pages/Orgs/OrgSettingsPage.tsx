import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams, useNavigate } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";
import { StorageBar } from "../../components/StorageBar";
import styles from "./OrgSettings.module.css";
import { DangerZone } from "../../components/DangerZone";
import { EditableField } from "../../components/EditableField";
import { useNotifications } from "../../contexts/NotificationContext";
import { Minus } from "lucide-react";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import statusStyles from "../Organizations/Organizations.module.css"

export default function OrgSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { registerListener, unregisterListener } = useNotifications();

  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [userID, setUserID] = useState<string>("");
  const [usedSpace, setUsedSpace] = useState<number>(0);
  const [maxSpace, setMaxSpace] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (res.status === 404 || res.status === 400) {
          navigate("/404");
          return;
        }
        if (!res.ok) {
            setOrgError("Failed to fetch Organization.")
            throw new Error("Failed to fetch Organization.");
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setOrgName(data.name);
          setMyRole(data.role);
          setUsedSpace(data.used_space);
          setMaxSpace(data.max_space);
          setOrgDesc(data.description);
          setUserID(data.user_id);
        }
      })
      .catch(() => setOrgName("Unknown"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    const handleOrgaRenamed = (data: any) => {
      if (data && data.new_name) {
        setOrgName(data.new_name);
      }
    };

    const handleRoleUpdated = (data: any) => {
      if (data && data.user_id === userID && data.role) {
        setMyRole(data.role);
      }
    };

    registerListener("ORGA_RENAMED", handleOrgaRenamed);
    registerListener("ROLE_UPDATED", handleRoleUpdated);

    return () => {
      unregisterListener("ORGA_RENAMED", handleOrgaRenamed);
      unregisterListener("ROLE_UPDATED", handleRoleUpdated);
    };
  }, [registerListener, unregisterListener, id, userID]);

  const handleDeleteOrga = async () => {
    try {
      const response = await fetchWithRefresh(`/api/orgs/${id}`, { method: "DELETE" });

      if (!response.ok) {
          if (response.status === 502 || response.status === 503) {
              setError("Network error, please try again later.");
          } else {
              const body = await response.json().catch(() => null);
              setError(body?.message || body?.error || "Failed to delete organization.");
          }
          return;
      }

      window.dispatchEvent(new CustomEvent("org-list-changed"));
      navigate("/organizations");
    } catch (err) {
      setError("Network error, please try again.");
    }
  };

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleLeaveOrga = async () => {
    try {
      const response = await fetchWithRefresh(`/api/orgs/${id}/members/me`, { method: "DELETE" });

      if (!response.ok) {
          if (response.status === 502 || response.status === 503) {
              setModalError("Network error, please try again later.");
          } else {
              const body = await response.json().catch(() => null);
              setModalError(body?.message || body?.error || "Failed to leave organization.");
          }
          return;
      }

      setModalError(null);
      setShowLeaveConfirm(false);
      navigate("/organizations")
    } catch (err) {
      console.error("Network error:", err);
      setModalError("Network error, please try again.");
      return;
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
        <ConfirmationModal
          isOpen={showLeaveConfirm}
          fileName={orgName}
          onConfirm={handleLeaveOrga}
          onCancel={() => { setShowLeaveConfirm(false); setModalError(null); }}
          isAccount={false}
          isLeaveOrga={true}
          isMe={true}
          errorMessage={modalError ?? undefined}
        />
        <div className={styles.headerSection}>
          <div className={styles.titleGroup}>
            <h1>Organization Settings</h1>
            <p className={styles.subtitle}>Manage your organization details and storage</p>
          </div>
        </div>
        { orgError ? (
          <div className={`${statusStyles.statusMessage} ${statusStyles.error}`}>
              {orgError}
          </div>
        ) : (
          <>
            <div className={styles.settingsGrid}>
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>General Information</h2>
                <div className={styles.fieldGroup}>
                  <EditableField
                    label="Organization name"
                    value={orgName}
                    role={myRole}
                    onSave={handleRenameOrg}
                    isOrgaName={true}
                  />
                  <EditableField
                    label="Organization description"
                    value={orgDesc}
                    role={myRole}
                    onSave={handleChangeDescription}
                    handleReset={handleResetDescription}
                    isOrgaDesc={true}
                  />
                  <div className={styles.leaveOrga}>
                    <div>
                      <p className={styles.label}>Leave Organization</p>
                      <p className={styles.labelDetail}> If you want to leave this organization, be aware that all the files you upload in this organization will remain. </p>
                    </div>
                    <button
                      className={styles.leaveButton}
                      onClick={() => { setShowLeaveConfirm(true); setModalError(null); }}
                    >
                      <Minus size={20} />
                      Leave Organization
                    </button>
                  </div>
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
          </>
        )}
      </div>
    </OrgLayout>
  );
}
