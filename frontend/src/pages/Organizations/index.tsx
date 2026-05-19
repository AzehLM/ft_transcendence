import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { SettingsLayout } from "../Profile/SettingsLayout";
import styles from "../../styles/profile.module.css";
import orgaStyles from "./Organizations.module.css"
import { UserPlus, UserMinus } from "lucide-react";
import { generateOrganization, addMemberToOrg } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { organizationSchema } from "../../schemas/organization.schema";
import { getPublicKeyFromSession, getPrivateKeyFromSession } from "../../services/crypto.service";
import { resetKeys } from "../../services/auth.service";


interface Organization {
  id: string;
  name: string;
  role: string;
  enc_org_priv_key: string;
  description: string;
}

export default function OrganizationsPage() {
  const navigate = useNavigate();


  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [publicKeyMissing, setPublicKeyMissing] = useState(false);

  useEffect(() => {
    fetchWithRefresh("/api/orgs")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch organizations.");
        return res.json();
      })
      .then(data => setOrgs(data))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, []);

  const [modalError, setModalError] = useState<string | null>(null);

  // Create an orga
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const handleCreateOrg = async () => {
    try {
      const result = organizationSchema.safeParse({ name: orgName });
      if (!result.success) {
        console.log(result.error.issues[0].message);
        setModalError(result.error.issues[0].message);
        return;
      }

      // handle missing public key
      const userPublicKey = await getPublicKeyFromSession();
      if (!userPublicKey) {
        setPublicKeyMissing(true)
        return;
      }

      const data = await generateOrganization(result.data.name);
      // console.log("org data to send:", data);
      const response = await fetchWithRefresh("/api/orgs", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = "Failed to create organization.";
        try {
          if (text) {
            const err = JSON.parse(text);
            message = err.error || err.message || message;
          }
        } catch {}
        setModalError(message);
        return;
      }

      const newOrg = await response.json();
      setOrgs(prev => [...prev, { ...newOrg, role: "admin" }]);
      setShowCreateModal(false);
      setOrgName("");
    } catch (err) {
      console.error("Error:", err);
      setModalError("An error occurred, please try again.");
    }
  };

  // Add a member
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !selectedOrg) return;
    setModalError(null);

    const userPrivateKey = await getPrivateKeyFromSession();
    if (!userPrivateKey) {
      setPublicKeyMissing(true)
      return;
    }

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
        const text = await response.text();
        let message = "Failed to leave organization.";
        try {
          if (text) {
            const data = JSON.parse(text);
            message = data.error || data.message || message;
          }
        } catch {}
        setShowLeaveConfirm(false);
        setOrgErrors(prev => ({ ...prev, [selectedOrg.id]: message }));
        return;
      }

      setShowLeaveConfirm(false);
      setOrgs(prev => prev.filter(o => o.id !== selectedOrg.id));
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

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

    useEffect(() => {
    fetchWithRefresh("/api/auth/me")
        .then(res => res.json())
        .then(data => setEmail(data.email));
    }, []);

  const handleResetKeys = async () => {
    setModalError(null);
    if (!password) return;

    const { success, error } = await resetKeys(email, password);
    if (!success) {
      setModalError(error ?? "Error !");
      return;
    }

    setPassword("");
    setPublicKeyMissing(false);
    setModalError(null);
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
        <ConfirmationModal
          isOpen={publicKeyMissing}
          fileName={orgName}
          onConfirm={handleResetKeys}
          onCancel={() => { setPublicKeyMissing(false); setModalError(null); }}
          isKeyMissing={true}
          inputValue={password}
          onInputChange={setPassword}
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
                          <p className={orgaStyles.orgDesc}>{org.description}</p>
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
