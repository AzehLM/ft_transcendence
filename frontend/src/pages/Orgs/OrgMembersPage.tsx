import { useState, useEffect, useRef } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams, useNavigate } from "react-router-dom";
import { addMemberToOrg } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import styles from "./OrgMembers.module.css";
import { UserMinus, Shield, UserPlus, User } from "lucide-react";
import { OrgLayout } from "./OrgLayout";
import { useKeyCheck } from "../../hooks/useKeyCheck";
import { useNotifications } from "../../contexts/NotificationContext";
import { FeedbackMessageContainer } from "../../components/FeedbackMessageContainer";
import { useMessages } from "../../hooks/useFeedbackMessage";
import statusStyles from "../Organizations/Organizations.module.css"

interface Member {
  user_id: string;
  email: string;
  role: string;
  family_name: string;
  first_name: string;
  is_online?: boolean;
}

export default function OrgMembersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { registerListener, unregisterListener, status } = useNotifications();

  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const [orgName, setOrgName] = useState<string>("");
  const [orgDesc, setOrgDesc] = useState<string>("");

  const { keyMissing, setKeyMissing, password, 
    setPassword, isResetting, keyModalError, setKeyModalError, 
    checkKeys, handleResetKeys } = useKeyCheck();
    
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const avatarUrlsRef = useRef<Record<string, string>>({});
  
  const [mainError, setMainError] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const { messages, addMessage, removeMessage } = useMessages();
  const allMessages = messages;

  useEffect(() => {
    return () => { (Object.values(avatarUrlsRef.current) as string[]).forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const setAvatarUrl = (userId: string, newUrl: string) => {
    if (avatarUrlsRef.current[userId]) {
      URL.revokeObjectURL(avatarUrlsRef.current[userId]);
    }
    avatarUrlsRef.current[userId] = newUrl;
    setAvatarUrls((prev: Record<string, string>) => ({ ...prev, [userId]: newUrl }));
  };

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (!res.ok) {
            setOrgError("Failed to fetch Organization.")
            throw new Error("Failed to fetch Organization.");
        }
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

  const fetchMembers = (signal?: AbortSignal) => {
    setMainError(null);
    fetchWithRefresh(`/api/orgs/${id}/members`, { signal })
      .then(res => {
        if (res.status === 404 || res.status === 400) {
          navigate("/404");
          return null;
        }
        if (!res.ok) {
          setMainError("Failed to fetch members.");
          throw new Error("Failed to fetch members.");
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setMembers(data);

        data.forEach((member: Member) => {
          fetchWithRefresh(`/api/user/${member.user_id}/avatar`, { signal })
            .then(res => {
              if (!res.ok) return null;
              return res.blob();
            })
            .then(blob => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                setAvatarUrl(member.user_id, url);
              }
            })
            .catch(err => { if (err?.name !== "AbortError") {} });
        });

        fetchWithRefresh("/api/auth/me", { signal })
          .then(res => {
            if (!res.ok) throw new Error("Failed to fetch user.");
            return res.json();
          })
          .then(me => {
            const myMember = data.find((m: Member) => m.email === me.email);
            if (myMember) {
              setMyRole(myMember.role);
              setMyUserId(myMember.user_id);
            }
          })
          .catch(err => { if (err?.name !== "AbortError") setMyRole(null); });
      })
      .catch(err => {
        if (err?.name === "AbortError") return;
        setMembers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(controller.signal);
    return () => controller.abort();
  }, [id, navigate, status]);

  useEffect(() => {
    const handleMemberChange = () => {
      fetchMembers();
    };

    const handleUserOnline = (data: any) => {
      if (data && data.user_id) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === data.user_id ? { ...m, is_online: true } : m
          )
        );
      }
    };

    const handleUserOffline = (data: any) => {
      if (data && data.user_id) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === data.user_id ? { ...m, is_online: false } : m
          )
        );
      }
    };

    const handleOrgaRenamed = (data: any) => {
      if (data && data.new_name) {
        setOrgName(data.new_name);
      }
    };

    const handleRoleUpdated = (data: any) => {
      if (data && data.user_id && data.role) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === data.user_id ? { ...m, role: data.role } : m
          )
        );
        if (myUserId && data.user_id === myUserId) {
          setMyRole(data.role);
        }
      }
    };

    registerListener("MEMBER_ADDED", handleMemberChange);
    registerListener("MEMBER_REMOVED", handleMemberChange);
    registerListener("USER_PROFILE_UPDATED", handleMemberChange);
    registerListener("USER_ONLINE", handleUserOnline);
    registerListener("USER_OFFLINE", handleUserOffline);
    registerListener("ORGA_RENAMED", handleOrgaRenamed);
    registerListener("ROLE_UPDATED", handleRoleUpdated);

    return () => {
      unregisterListener("MEMBER_ADDED", handleMemberChange);
      unregisterListener("MEMBER_REMOVED", handleMemberChange);
      unregisterListener("USER_PROFILE_UPDATED", handleMemberChange);
      unregisterListener("USER_ONLINE", handleUserOnline);
      unregisterListener("USER_OFFLINE", handleUserOffline);
      unregisterListener("ORGA_RENAMED", handleOrgaRenamed);
      unregisterListener("ROLE_UPDATED", handleRoleUpdated);
    };
  }, [registerListener, unregisterListener, id, myUserId]);

  const handleAddMember = async () => {
    if (!memberEmail.trim()) return;
    setModalError(null);

    const hasKeys = await checkKeys();
    if (!hasKeys) {
      return
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
    addMessage(`${memberEmail} added to ${orgName}`, "success");
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
    addMessage(`${selectedMember.email} successfully changed role`, "success");
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
    addMessage(`${memberToRemove.email} was removed from ${orgName}`, "success");
  };

  const getName = (member: Member) => {
    if (member.first_name || member.family_name) {
      return `${member.first_name ?? ""} ${member.family_name ?? ""}`.trim();
    }
    return member.email;
  };

  return (
    <OrgLayout orgName={orgName} orgDesc={orgDesc}>
      <div className={styles.container}>
        <FeedbackMessageContainer messages={allMessages} onRemove={removeMessage} />
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

        {loading ? (
          <div className={styles.loadingState}>Loading members...</div>
        ) : mainError || orgError ? (
            <>
                {orgError && (
                    <div className={`${statusStyles.statusMessage} ${statusStyles.error}`}>
                        {orgError}
                    </div>
                )}
                {mainError && (
                    <div className={`${statusStyles.statusMessage} ${statusStyles.error}`}>
                        {mainError}
                    </div>
                )}
            </>
        ) : members.length === 0 ? (
          <div className={styles.emptyState}>No members found.</div>
        ) : (
          <div className={styles.memberList}>
            {members.map((member) => (
              <div key={member.user_id} className={styles.memberCard}>
                <div className={styles.avatar}>
                  {avatarUrls[member.user_id] ? (
                    <img
                      src={avatarUrls[member.user_id]}
                      alt={getName(member)}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <User size={22} strokeWidth={1.5} color="#865142" />
                  )}
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
                    <span className={`${styles.statusDot} ${
                      member.is_online ? styles.statusDotActive : styles.statusDotInactive
                    }`}></span>
                    {member.is_online ? "Active" : "Offline"}
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
        isOpen={keyMissing}
        fileName=""
        onConfirm={handleResetKeys}
        onCancel={() => { setKeyMissing(false); setKeyModalError(null); }}
        isKeyMissing={true}
        inputValue={password}
        onInputChange={setPassword}
        errorMessage={keyModalError ?? undefined}
        isLoading={isResetting}
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