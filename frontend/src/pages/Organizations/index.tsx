// import styles from "../../styles/profile.module.css";
// import { SettingsLayout } from "../Profile/SettingsLayout";

// export default function ProfilePage() {

//     return (

//         <SettingsLayout>
//           <h2 className={styles.subtitle}>Your Organizations</h2>
//         </SettingsLayout>
//     );
// }

import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { SettingsLayout } from "../Profile/SettingsLayout";
import styles from "../../styles/profile.module.css";
import orgaStyles from "./Organizations.module.css"
import { UserPlus, UserMinus } from "lucide-react";
import { generateOrganization } from "../../services/organizations.service";

interface Organization {
  id: string;
  name: string;
  role: string;
  enc_org_priv_key: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSelectedOrg] = useState<Organization | null>(null);


  useEffect(() => {
    fetchWithRefresh("/api/orgs")
      .then(res => res.json())
      .then(data => setOrgs(data))
      .finally(() => setLoading(false));
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    const data = await generateOrganization(orgName);
    console.log("org data to send:", data);
    // fetch API to do
    setShowCreateModal(false);
    setOrgName("");
  };


  return (
    <SettingsLayout>
    <div className={styles.mainBox}>
        <h2 className={styles.subtitle}>Organizations</h2>
        <div className={orgaStyles.header}>
            <button 
            className={`${styles.buttonChange} ${styles.profileButton}`} 
            onClick={() => setShowCreateModal(true)}
            >
            + Create Organization
            </button>
        </div>

{/* Modal temporaire */}
{showCreateModal && (
  <>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999 }}
      onClick={() => setShowCreateModal(false)}
    />
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white", padding: "32px",
      borderRadius: "12px", zIndex: 1000,
      display: "flex", flexDirection: "column", gap: "16px",
      minWidth: "300px"
    }}>
      <h3>Create Organization</h3>
      <input
        type="text"
        placeholder="Organization name"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
      />
      <button onClick={handleCreateOrg}>Create</button>
      <button onClick={() => setShowCreateModal(false)}>Cancel</button>
    </div>
  </>
)}


        <div className={orgaStyles.organizations}>
            {loading ? (
                <p>Loading...</p>
            ) : orgs.length === 0 ? (
                <p className={orgaStyles.empty}>You are not part of any organization.</p>
            ) : (
                <div className={orgaStyles.orgList}>
                {orgs.map((org) => (
                    <div key={org.id} className={orgaStyles.orgCard} onClick={() => setSelectedOrg(org)}>
                    <div className={orgaStyles.orgInfo}>
                        <p className={orgaStyles.orgName}>{org.name}</p>
                        <p className={orgaStyles.orgRole}>{org.role}</p>
                    </div>

                    <div className={orgaStyles.orgActions}>
                        {org.role === "admin" && (
                        <button
                            className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconAdd}`}
                            onClick={(e) => {
                            e.stopPropagation();
                            }}
                        >
                            <UserPlus size={20} />
                            Add
                        </button>
                        )}
                        <button
                        className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconLeave}`}
                        onClick={(e) => e.stopPropagation()}
                        >
                        <UserMinus size={20} />
                        Leave
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            )}    
        </div>
    </div>
      {/* <div className={styles.mainBox}>
        <h2 className={styles.subtitle}>Organizations</h2>
        {loading ? (
          <p>Loading...</p>
        ) : orgs.length === 0 ? (
          <p>You are not part of any organization.</p>
        ) : (
          orgs.map((org) => (
            <div key={org.id} className={styles.dangerRow}>
              <div>
                <p className={styles.dangerLabel}>{org.name}</p>
                <p className={styles.dangerDescription}>{org.role}</p>
              </div>
            </div>
          ))
        )}
      </div> */}
    </SettingsLayout>
  );
}