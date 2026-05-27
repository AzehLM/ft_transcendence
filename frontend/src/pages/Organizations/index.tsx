import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import styles from "./Organizations.module.css";
import { UserPlus, UserMinus, Plus, Building2 } from "lucide-react";
import { generateOrganization, addMemberToOrg } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { organizationSchema } from "../../schemas/organization.schema";
import { getPublicKeyFromSession, getPrivateKeyFromSession } from "../../services/crypto.service";
import { resetKeys } from "../../services/auth.service";
import { z } from "zod";
import { useNotifications } from "../../contexts/NotificationContext";


interface Organization {
  id: string;
  name: string;
  role: string;
  enc_org_priv_key: string;
  description: string;
}

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { registerListener, unregisterListener, reconnect } = useNotifications();


  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [publicKeyMissing, setPublicKeyMissing] = useState(false);

  const fetchOrgs = () => {
    fetchWithRefresh("/api/orgs")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch organizations.");
        return res.json();
      })
      .then(data => setOrgs(data))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    const handleOrgChange = () => {
      fetchOrgs();
    };

    registerListener("ADDED_TO_NEW_ORGA", handleOrgChange);
    registerListener("MEMBER_ADDED", handleOrgChange);
    registerListener("MEMBER_REMOVED", handleOrgChange);
    registerListener("ORGA_RENAMED", handleOrgChange);
    registerListener("ORGA_DELETED", handleOrgChange);
    registerListener("USER_PROFILE_UPDATED", handleOrgChange);

    return () => {
      unregisterListener("ADDED_TO_NEW_ORGA", handleOrgChange);
      unregisterListener("MEMBER_ADDED", handleOrgChange);
      unregisterListener("MEMBER_REMOVED", handleOrgChange);
      unregisterListener("ORGA_RENAMED", handleOrgChange);
      unregisterListener("ORGA_DELETED", handleOrgChange);
      unregisterListener("USER_PROFILE_UPDATED", handleOrgChange);
    };
  }, [registerListener, unregisterListener]);

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
      reconnect();
    } catch (err) {
      console.error("Error:", err);
      setModalError("An error occurred, please try again.");
    }
  };

  // Add a member
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const handleAddMember = async () => {
    const result = z.email().safeParse(memberEmail);
    if (!result.success) {
      setAddMemberError("Please enter a valid email");
      return ;
    }

    if (!memberEmail.trim() || !selectedOrg) return;
    setAddMemberError(null);

    const userPrivateKey = await getPrivateKeyFromSession();
    if (!userPrivateKey) {
      setPublicKeyMissing(true)
      return;
    }

    const { success, error } = await addMemberToOrg(selectedOrg.id, memberEmail);
    if (!success) {
      setAddMemberError(error ?? "Failed to add member.");
      return;
    }

    setMemberEmail("");
    setShowAddMemberModal(false);
  };

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

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleGroup}>
            <h1>Organizations</h1>
            <p className={styles.subtitle}>Manage your organizations and memberships</p>
          </div>
          <button
            className={styles.addButton}
            onClick={() => { setShowCreateModal(true); setModalError(null); }}
          >
            <Plus size={20} />
            Create Organization
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
          onCancel={() => { setShowAddMemberModal(false); setAddMemberError(null); }}
          isAddMember={true}
          inputValue={memberEmail}
          onInputChange={(value) => {
            setMemberEmail(value);
            if (addMemberError) setAddMemberError(null);
          }}
          errorMessage={addMemberError ?? undefined}
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

        {loading ? (
            <div className={styles.loadingState}>Loading organizations...</div>
        ) : orgs.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Building2 size={32} />
              </div>
              <h2 className={styles.emptyTitle}>No organizations yet</h2>
              <p className={styles.emptyDescription}>
                Create your first organization to start collaborating and sharing files with your team securely.
              </p>
              <button
                className={styles.emptyButton}
                onClick={() => { setShowCreateModal(true); setModalError(null); }}
              >
                <Plus size={20} />
                Create your first Organization
              </button>
            </div>
        ) : (
            <div className={styles.orgList}>
            {orgs.map((org) => (
                <div key={org.id} className={styles.orgCard}
                  onClick={() => navigate(`/orgs/${org.id}/files`, { state: { orgName: org.name } })}>

                  <div className={styles.orgAvatar}>
                    <span className={styles.initialsAvatar}>
                      {getInitials(org.name)}
                    </span>
                  </div>

                  <div className={styles.orgInfo}>
                      <h3 className={styles.orgName}>{org.name}</h3>
                      <p className={styles.orgDesc}>{org.description || "No description provided"}</p>
                  </div>

                  <div className={styles.orgActions}>
                      <div className={`${styles.roleTag} ${org.role.toLowerCase() === 'admin' ? styles.roleAdmin : ""}`}>
                        {org.role}
                      </div>

                      {org.role === "admin" && (
                      <button
                          className={`${styles.buttonIcon} ${styles.buttonIconAdd}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrg(org);
                            setShowAddMemberModal(true);
                            setModalError(null);
                          }}
                          title="Add Member"
                      >
                          <UserPlus size={18} />
                      </button>
                      )}
                      <button
                        className={`${styles.buttonIcon} ${styles.buttonIconLeave}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrg(org);
                          setShowLeaveConfirm(true);
                        }}
                        title="Leave Organization"
                      >
                        <UserMinus size={18} />
                      </button>
                  </div>
                    {orgErrors[org.id] && (
                      <p className={styles.errorState}>{orgErrors[org.id]}</p>
                    )}
                </div>
            ))}
            {selectedOrg && (
              <ConfirmationModal
                isOpen={showLeaveConfirm}
                fileName={selectedOrg.name}
                onConfirm={handleLeaveOrga}
                onCancel={() => setShowLeaveConfirm(false)}
                isAccount={false}
                isLeaveOrga={true}
                isMe={true}
              />
            )}

            </div>
        )}
    </div>
  );
}
