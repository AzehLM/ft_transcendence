import { useState, useEffect } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";
import profileStyles from "../../styles/profile.module.css";
import { addMemberToOrg } from "../../services/organizations.service";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import orgaStyles from "../Organizations/Organizations.module.css"

export default function OrgMembersPage() {

  const { id } = useParams();
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
  fetchWithRefresh(`/api/orgs/${id}`)
    .then(res => res.json())
    .then(data => setOrgName(data.name))
    .catch(() => setOrgName("Unknown"));

  }, [id]);


    // Add a member
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [memberEmail, setMemberEmail] = useState("");
    const [modalError, setModalError] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !id) return;
    setModalError(null);

    const { success, error } = await addMemberToOrg(id, memberEmail);
    if (!success) {
      setModalError(error ?? "Failed to add member.");
      return;
    }

    setMemberEmail("");
    setShowAddMemberModal(false);
  };

  return (
    <OrgLayout title="Organization members" orgName={orgName} showActionButtons={false}>
      <div className={orgaStyles.header}>
            <button 
            className={`${profileStyles.buttonChange} ${profileStyles.profileButton}`} 
            onClick={() => { setShowAddMemberModal(true); setModalError(null); }}
            >
            + Add a member
            </button>
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
    </OrgLayout>
  );
}