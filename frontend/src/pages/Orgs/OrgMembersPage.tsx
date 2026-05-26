import { useState, useEffect } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams, useNavigate } from "react-router-dom";
import { addMemberToOrg } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import styles from "./OrgMembers.module.css";
import { UserMinus, Shield, UserPlus } from "lucide-react";
import { OrgLayout } from "./OrgLayout";
import { getPrivateKeyFromSession } from "../../services/crypto.service";
import { resetKeys } from "../../services/auth.service";
import { z } from "zod";

interface Member {
  user_id: string;
  email: string;
  role: string;
  family_name: string;
  first_name: string;
}

export default function OrgMembersPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const [publicKeyMissing, setPublicKeyMissing] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}/members`)
      .then(res => {
        if (res.status === 404 || res.status === 400) {
          navigate("/404");
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch members.");
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setMembers(data);

        fetchWithRefresh("/api/auth/me")
          .then(res => {
            if (!res.ok) throw new Error("Failed to fetch user.");
            return res.json();
          })
          .then(me => {
            setEmail(me.email);
            const myMember = data.find((m: Member) => m.email === me.email);
            if (myMember) setMyRole(myMember.role);
          })
          .catch(() => setMyRole(null));
      })
      .catch(() => {
        setMembers([]);
        setError("Failed to load members.");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddMember = async () => {
    const result = z.email().safeParse(memberEmail);
    if (!result.success) {
      setModalError("Please enter a valid email");
      return ;
    }
    setModalError(null);

    const userPrivateKey = await getPrivateKeyFromSession();
    if (!userPrivateKey) {
      setPublicKeyMissing(true);
      return;
    }

    const { success, error } = await addMemberToOrg(id!, memberEmail);
    if (!success) {
      setModalError(error ?? "Failed to add member.");
      return;
    }

    try {
      const res = await fetchWithRefresh(`/api/orgs/${id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch {}

    setMemberEmail("");
    setShowAddMemberModal(false);
  };

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

  const handleChangeRole = async () => {
    if (!selectedMember) return;
    const response = await fetchWithRefresh(`/api/orgs/${id}/members/${selectedMember.user_id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = "Failed to change role.";
      try {
        if (text) {
          const data = JSON.parse(text);
          message = data.error || data.message || message;
        }
      } catch {}
      setModalError(message);
      return;
    }

    setMembers(prev => prev.map(m =>
      m.user_id === selectedMember.user_id ? { ...m, role: newRole } : m
    ));
    setShowChangeRoleModal(false);
    setSelectedMember(null);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    const response = await fetchWithRefresh(`/api/orgs/${id}/members/${memberToRemove.user_id}`, { method: "DELETE" });

    if (!response.ok) {
      const text = await response.text();
      let message = "Failed to remove member.";
      try {
        if (text) {
          const data = JSON.parse(text);
          message = data.error || data.message || message;
        }
      } catch {}
      setModalError(message);
      return;
    }

    setMembers(prev => prev.filter(m => m.user_id !== memberToRemove.user_id));
    setShowRemoveModal(false);
    setMemberToRemove(null);
  };

  const getInitials = (member: Member) => {
    if (member.first_name && member.family_name) {
      return `${member.first_name[0]}${member.family_name[0]}`.toUpperCase();
    }
    return member.email[0].toUpperCase();
  };

  const getName = (member: Member) => {
    if (member.first_name || member.family_name) {
      return `${member.first_name ?? ""} ${member.family_name ?? ""}`.trim();
    }
    return member.email;
  };

  return (
    <OrgLayout title="" showActionButtons={false}>
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleGroup}>
            <h1>Organization Members</h1>
            <p className={styles.subtitle}>Manage your organization members and their roles</p>
          </div>
          {myRole === "admin" && (
            <button
              className={styles.addButton}
              onClick={() => { setShowAddMemberModal(true); setModalError(null); }}
            >
              <UserPlus size={20} />
              Add member
            </button>
          )}
        </div>

        {error && <div className={styles.errorState}>{error}</div>}

        {loading ? (
          <div className={styles.loadingState}>Loading members...</div>
        ) : members.length === 0 ? (
          <div className={styles.emptyState}>No members found.</div>
        ) : (
          <div className={styles.memberList}>
            {members.map((member) => (
              <div key={member.user_id} className={styles.memberCard}>
                <div className={styles.avatar}>
                  <span className={styles.initialsAvatar}>
                    {getInitials(member)}
                  </span>
                </div>
                <div className={styles.memberInfo}>
                  <h3 className={styles.memberName}>{getName(member)}</h3>
                  <p className={styles.memberEmail}>{member.email}</p>
                </div>
                <div className={styles.memberActions}>
                  <div className={`${styles.roleTag} ${
                    member.role.toLowerCase() === 'admin' ? styles.roleAdmin :
                    member.role.toLowerCase() === 'editor' ? styles.roleEditor :
                    styles.roleViewer
                  }`}>
                    {member.role}
                  </div>
                  <div className={styles.statusInfo}>
                    <span className={`${styles.statusDot} ${styles.statusDotActive}`}></span>
                    Active
                  </div>
                  {myRole === "admin" && (
                    <div className={styles.buttonsGroup}>
                      <button
                        className={`${styles.actionBtn} ${styles.roleBtn}`}
                        title="Change Role"
                        aria-label={`Change role for ${getName(member)}`}
                        onClick={() => {
                          setSelectedMember(member);
                          setNewRole(member.role === "admin" ? "member" : "admin");
                          setShowChangeRoleModal(true);
                        }}
                      >
                        <Shield size={18} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.kickBtn}`}
                        title="Remove Member"
                        aria-label={`Remove ${getName(member)} from organization`}
                        onClick={() => {
                          setMemberToRemove(member);
                          setShowRemoveModal(true);
                        }}
                      >
                        <UserMinus size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
        fileName=""
        onConfirm={handleResetKeys}
        onCancel={() => { setPublicKeyMissing(false); setModalError(null); }}
        isKeyMissing={true}
        inputValue={password}
        onInputChange={setPassword}
        errorMessage={modalError ?? undefined}
      />

      <ConfirmationModal
        isOpen={showChangeRoleModal}
        fileName={selectedMember?.email ?? ""}
        onConfirm={handleChangeRole}
        errorMessage={modalError ?? undefined}
        onCancel={() => { setShowChangeRoleModal(false); setSelectedMember(null); setModalError(null); }}
        isChangeRole={true}
        newRole={newRole}
      />

      <ConfirmationModal
        isOpen={showRemoveModal}
        errorMessage={modalError ?? undefined}
        onCancel={() => { setShowRemoveModal(false); setMemberToRemove(null); setModalError(null); }}
        fileName={memberToRemove?.email ?? ""}
        onConfirm={handleRemoveMember}
        isRemoveMember={true}
      />
    </OrgLayout>
  );
}
