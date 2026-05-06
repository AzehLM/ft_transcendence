import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { SettingsLayout } from "../Profile/SettingsLayout";
import styles from "../../styles/profile.module.css";
import orgaStyles from "./Organizations.module.css"
import { UserPlus, UserMinus } from "lucide-react";
import { generateOrganization, encryptOrgKeyForMember, decryptOrgPrivateKey } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { addMemberToOrg } from "../../services/organizations.service";

interface Organization {
  id: string;
  name: string;
  role: string;
  enc_org_priv_key: string;
}

export default function OrganizationsPage() {
  const navigate = useNavigate();


  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);


  useEffect(() => {
    fetchWithRefresh("/api/orgs")
      .then(res => res.json())
      .then(data => setOrgs(data))
      .finally(() => setLoading(false));
  }, []);

  const [modalError, setModalError] = useState<string | null>(null);

  // Create an orga
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    try {
      const data = await generateOrganization(orgName);
      // console.log("org data to send:", data);

      const response = await fetchWithRefresh("/api/orgs", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Failed to create org:", err);
        setModalError(err.error || err.message || "Failed to create organization.");
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

const handleAddMember = async () => {
  if (!memberEmail.trim() || !selectedOrg) return;
  setModalError(null);

  const { success, error } = await addMemberToOrg(selectedOrg.id, memberEmail);
  if (!success) {
    setModalError(error ?? "Failed to add member.");
    return;
  }

  setMemberEmail("");
  setShowAddMemberModal(false);
};

  // Debug org key
  // const handleDebugOrgKey = async () => {
  //   if (!selectedOrg) return;
  //   try {
  //     const keysRes = await fetchWithRefresh(`/api/orgs/${selectedOrg.id}/members/keys`);
  //     // const keysData = await keysRes.json();
  //     // console.log("raw keys data:", keysData);
  //     // console.log("enc_org_priv_key:", keysData.enc_org_priv_key);
  //     // console.log("enc_aes_key:", keysData.enc_aes_key);
  //     // console.log("iv:", keysData.iv);
  //     const { enc_org_priv_key, enc_aes_key, iv } = await keysRes.json();

  //     const orgPrivKey = await decryptOrgPrivateKey(enc_org_priv_key, enc_aes_key, iv);
  //     console.log("🔑 Org Private Key (base64):", orgPrivKey);
  //   } catch (err) {
  //     console.error("Error:", err);
  //   }
  // };

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  
  const handleLeaveOrga = async () => {
    try {
      if (!selectedOrg) {
        setShowLeaveConfirm(false);
        return;
      }
      const response = await fetchWithRefresh(`/api/orgs/${selectedOrg.id}/members/me`, { method: "DELETE" });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to leave organization:", data);
        setShowLeaveConfirm(false);
        setOrgErrors(prev => ({
          ...prev,
          [selectedOrg.id]: data.error || data.message || "Failed to leave organization."
        }));
        return;
      }

      setShowLeaveConfirm(false);
      setOrgs(orgs.filter(o => o.id !== selectedOrg.id));
      setSelectedOrg(null);

    } catch (err) {
      console.error("Network error:", err);
      setShowLeaveConfirm(false);
      if (selectedOrg) {
        setOrgErrors(prev => ({
          ...prev,
          [selectedOrg.id]: "Network error, please try again."
        }));
      }
    }
  };

  return (
    <SettingsLayout>
    <div className={styles.mainBox}>
        <h2 className={styles.subtitle}>Organizations</h2>
        <div className={orgaStyles.header}>
            <button 
            className={`${styles.buttonChange} ${styles.profileButton}`} 
            onClick={() => { setShowCreateModal(true); setModalError(null); }}
            >
            + Create Organization
            </button>
        </div>

        <ConfirmationModal
          isOpen={showCreateModal}
          fileName={orgName}
          onConfirm={handleCreateOrg}
          onCancel={() => { setShowCreateModal(false); setModalError(null); }}
          isCreateOrga={true}
          inputValue={orgName}
          onInputChange={setOrgName}
          errorMessage={modalError ?? undefined}
        />

        <ConfirmationModal
          isOpen={showAddMemberModal}
          fileName={memberEmail}
          onConfirm={handleAddMember}
          onCancel={() => { setShowAddMemberModal(false); setModalError(null); }}
          isAddMember={true}
          inputValue={memberEmail}
          onInputChange={setMemberEmail}
          errorMessage={modalError ?? undefined}
        />
        <div className={orgaStyles.organizations}>
            {loading ? (
                <p>Loading...</p>
            ) : orgs.length === 0 ? (
                <p className={orgaStyles.empty}>You are not part of any organization.</p>
            ) : (
                <div className={orgaStyles.orgList}>
                {orgs.map((org) => (
                    <div key={org.id} className={orgaStyles.orgCard} 
                      onClick={() => navigate(`/orgs/${org.id}/files`, { state: { orgName: org.name } })}>
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
                                setModalError(null);
                              }}
                          >
                              <UserPlus size={20} />
                              Add
                          </button>
                          )}
                          <button
                          className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconLeave}`}
                          onClick={(e) => 
                            {e.stopPropagation()
                              setSelectedOrg(org);
                            setShowLeaveConfirm(true);}}
                          >
                          <UserMinus size={20} />
                          Leave
                          </button>
                      </div>
                        {orgErrors[org.id] && (
                          <p className={orgaStyles.orgErrorMessage}>{orgErrors[org.id]}</p>
                        )}
                    </div>
                ))}
                {selectedOrg && (
                  <ConfirmationModal
                    isOpen={showLeaveConfirm}
                    fileName={selectedOrg.name}
                    onConfirm={handleLeaveOrga}
                    onCancel={() => setShowLeaveConfirm(false)}
                    isTrash={false}
                    isAccount={false}
                    isLeaveOrga={true}
                    isMe={true}
                  />
                )}

                </div>
            )}    
        </div>
    </div>
    </SettingsLayout>
  );
}