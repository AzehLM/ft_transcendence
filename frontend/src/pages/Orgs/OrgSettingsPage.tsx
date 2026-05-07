import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { OrgLayout } from "./OrgLayout";
import { StorageBar } from "../../components/StorageBar";

export default function OrgSettingsPage() {

  const { id } = useParams();
  const [orgName, setOrgName] = useState<string>("");
  const [myRole, setMyRole] = useState<string | null>(null);
  const [usedSpace, setUsedSpace] = useState<number>(0);
  const [maxSpace, setMaxSpace] = useState<number>(0);
  const navigate = useNavigate();
  const toGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2);

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
      <StorageBar usedBytes={usedSpace} totalBytes={maxSpace} ></StorageBar>
    </OrgLayout>
  );
}