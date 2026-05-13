import { useState, useEffect } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";
import profileStyles from "../../styles/profile.module.css";
import { addMemberToOrg } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import orgaStyles from "../Organizations/Organizations.module.css"
import { UserMinus, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPrivateKeyFromSession } from "../../services/crypto.service";
import { resetKeys } from "../../services/auth.service";

interface Member {
  user_id: string;
  email: string;
  role: string;
  family_name: string;
  first_name: string;
}

export default function OrgMembersPage() {

  const { id } = useParams();
  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch org name.");
        return res.json();
      })
      .then(data => {
        if (data) {
          setOrgName(data.name);
          setOrgDesc(data.description);
        }
      })
      .catch(() => setOrgName("Unknown"));

  }, [id]);

    // Add a member
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [memberEmail, setMemberEmail] = useState("");
    const [modalError, setModalError] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!memberEmail.trim()) return;
    setModalError(null);

    const userPrivateKey = await getPrivateKeyFromSession();
    if (!userPrivateKey) {
      setPublicKeyMissing(true)
      return;
    }

    const { success, error } = await addMemberToOrg(id!, memberEmail);
    if (!success) {
      setModalError(error ?? "Failed to add member.");
      return;
    }

    // Refresh members list -> might be modified with websocket
    try {
      const res = await fetchWithRefresh(`/api/orgs/${id}/members`);
      const data = await res.json();
      setMembers(data);
    } catch {
      setModalError("Member added, but failed to refresh members.");
      return;
    }

    setMemberEmail("");
    setShowAddMemberModal(false);
  };


  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [publicKeyMissing, setPublicKeyMissing] = useState(false);

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

  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}/members`)
      .then(res => {
        if (res.status === 404 || res.status === 400) {
          navigate("/404");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch members.");
        return res.json();
      })
      .then(data => {
        setMembers(data);

        fetchWithRefresh("/api/auth/me")
          .then(res => {
            if (!res.ok) throw new Error("Failed to fetch user.");
            return res.json();
          })
          .then(me => {
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
  }, [id]);


  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<string>("");

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

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

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

  return (
    <OrgLayout title="Organization members" orgName={orgName} orgDesc={orgDesc} showActionButtons={false}>
        { myRole === "admin" && (
          <div className={orgaStyles.header}>
            <button 
            className={`${profileStyles.buttonChange} ${profileStyles.profileButton}`} 
            onClick={() => { setShowAddMemberModal(true); setModalError(null); }}
            >
            + Add a member
            </button>
          </div>
        )}
            
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
        {error && <p style={{ color: "#de7356", marginBottom: "16px" }}>{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : members.length === 0 ? (
          <p className={orgaStyles.empty}>No members found.</p>
        ) : (
          <div className={orgaStyles.orgList}>
            {members.map((member) => (
              <div key={member.user_id} className={orgaStyles.orgCard}>
                <div className={orgaStyles.orgInfo}>
                  <p className={orgaStyles.orgName}>
                    {member.first_name || member.family_name
                      ? `${member.first_name ?? ""} ${member.family_name ?? ""}`.trim()
                      : member.email}
                    {(member.first_name || member.family_name) && (
                      <span> ({member.email})</span>
                    )}
                  </p>
                  <p className={orgaStyles.orgRole}>{member.role}</p>
                </div>

              {myRole === "admin" && (
                <div className={orgaStyles.orgActions}>
                  <button
                    className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconAdd}`}
                    onClick={() => {
                      setSelectedMember(member);
                      setNewRole(member.role === "admin" ? "member" : "admin");
                      setShowChangeRoleModal(true);
                    }}
                  >
                    <Shield size={20} />
                    {member.role === "admin" ? "Make Member" : "Make Admin"}
                  </button>
                  <button
                    className={`${orgaStyles.buttonIcon} ${orgaStyles.buttonIconLeave}`}
                    onClick={() => {
                      setMemberToRemove(member);
                      setShowRemoveModal(true);
                    }}
                  >
                    <UserMinus size={20} />
                    Remove
                  </button>
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>

        <ConfirmationModal
          isOpen={showChangeRoleModal}
          fileName={selectedMember?.email ?? ""}
          onConfirm={handleChangeRole}
          errorMessage={modalError ?? undefined}
          onCancel={() => { setShowChangeRoleModal(false); setSelectedMember(null); setModalError(null); }}    isChangeRole={true}
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