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
import { generateOrganization, encryptOrgKeyForMember, decryptOrgPrivateKey } from "../../services/organizations.service";

interface Organization {
  id: string;
  name: string;
  role: string;
  enc_org_priv_key: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);


  useEffect(() => {
    fetchWithRefresh("/api/orgs")
      .then(res => res.json())
      .then(data => setOrgs(data))
      .finally(() => setLoading(false));
  }, []);

  // Create an orga
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    try {
      const data = await generateOrganization(orgName);
      console.log("org data to send:", data);

      const response = await fetchWithRefresh("/api/orgs", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Failed to create org:", err);
        return;
      }

      const newOrg = await response.json();
      setOrgs([...orgs, { ...newOrg, role: "admin" }]);
      setShowCreateModal(false);
      setOrgName("");
    } catch (err) {
      console.error("Error:", err);
    }
  };

  // Add a member
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

const handleAddMember = async () => {
  if (!memberEmail.trim() || !selectedOrg) return;
  setAdding(true);
  setAddMemberError(null);

  try {
    // Get the keys of user inviting
    const keysRes = await fetchWithRefresh(`/api/orgs/${selectedOrg.id}/members/keys`);
    if (!keysRes.ok) throw new Error("Failed to get org keys");
    const { enc_org_priv_key, enc_aes_key, iv } = await keysRes.json();

    // Get oublic key of user invited
    const pubKeyRes = await fetchWithRefresh(`/api/auth/public-key?email=${memberEmail}`);
    if (pubKeyRes.status === 404) {
      setAddMemberError("User not found.");
      return;
    }
    const { public_key } = await pubKeyRes.json();

    // Encrypt
    console.log("Adding member (3) - encrypt keys")
    const encryptedData = await encryptOrgKeyForMember(
      enc_org_priv_key,
      enc_aes_key,
      iv,
      public_key
    );

    // Send to back
    console.log("Adding member (4) - send to back")
    const response = await fetchWithRefresh(`/api/orgs/${selectedOrg.id}/members`, {
      method: "POST",
      body: JSON.stringify({
        user_email: memberEmail,
        ...encryptedData,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      setAddMemberError(err.message || "Failed to add member.");
      return;
    }

    setMemberEmail("");
    setShowAddMemberModal(false);
  } catch (err) {
    console.error("Error:", err);
    setAddMemberError("An error occurred, please try again.");
  } finally {
    setAdding(false);
  }
};

  // Debug org key
  // const handleDebugOrgKey = async () => {
  //   if (!selectedOrg) return;
  //   try {
  //     const keysRes = await fetchWithRefresh(`/api/orgs/${selectedOrg.id}/members/keys`);
  //     // const keysData = await keysRes.json();
  //     // console.log("raw keys data:", keysData);
  //     // console.log("enc_org_priv_key:", keysData.enc_org_priv_key);
  //     // console.log("encrypted_aes_key:", keysData.encrypted_aes_key);
  //     // console.log("iv:", keysData.iv);
  //     const { enc_org_priv_key, enc_aes_key, iv } = await keysRes.json();

  //     const orgPrivKey = await decryptOrgPrivateKey(enc_org_priv_key, enc_aes_key, iv);
  //     console.log("🔑 Org Private Key (base64):", orgPrivKey);
  //   } catch (err) {
  //     console.error("Error:", err);
  //   }
  // };


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

{showAddMemberModal && (
  <>
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999 }}
      onClick={() => { setShowAddMemberModal(false); setAddMemberError(null); }}
    />
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white", padding: "32px",
      borderRadius: "12px", zIndex: 1000,
      display: "flex", flexDirection: "column", gap: "16px",
      minWidth: "300px"
    }}>
      <h3>Add Member to {selectedOrg?.name}</h3>
      <input
        type="email"
        placeholder="alice@42lyon.fr"
        value={memberEmail}
        onChange={(e) => setMemberEmail(e.target.value)}
      />
      {addMemberError && (
        <p style={{ color: "#d32f2f", fontSize: "14px" }}>{addMemberError}</p>
      )}
      <button onClick={handleAddMember} disabled={adding}>
        {adding ? "Adding..." : "Add Member"}
      </button>
      <button onClick={() => { setShowAddMemberModal(false); setAddMemberError(null); }}>
        Cancel
      </button>
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
                        {/* <button className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconAdd}`} onClick={handleDebugOrgKey}>🔑 Debug Org Key</button> */}
                    </div>

                    <div className={orgaStyles.orgActions}>
                        {org.role === "admin" && (
                        <button
                            className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconAdd}`}
                            onClick={(e) => {
                            e.stopPropagation();
                              setSelectedOrg(org);
                              setShowAddMemberModal(true);
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
    </SettingsLayout>
  );
}