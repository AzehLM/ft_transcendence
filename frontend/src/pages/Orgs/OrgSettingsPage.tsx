import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";

export default function OrgSettingsPage() {

  const { id } = useParams();
  const [orgName, setOrgName] = useState<string>("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [usedSpace, setUsedSpace] = useState<string | null>(null);
  const [maxSpace, setMaxSpace] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWithRefresh(`/api/orgs/${id}`)
      .then(res => {
        if (res.status === 404 || res.status === 400) {
          navigate("/404");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch org.");
        return res.json();
      })
      .then(data => {
        if (data) {
          setOrgName(data.name);
          setMyRole(data.role);
          setUsedSpace(data.used_space);
          setMaxSpace(data.max_space);
        }
      })
      .catch(() => setOrgName("Unknown"));
  }, [id]);

  return (
    <OrgLayout title="Organization settings" orgName={orgName} showActionButtons={false}>
      <p>Org name: {orgName}</p>
      <p>My role: {myRole}</p>
      <p>Org ID: {id}</p>
      <p>Used space: {usedSpace}</p>
      <p>Max space: {maxSpace}</p>
    </OrgLayout>
  );
}