import { useState, useEffect } from "react";
import { Files, Network, ChevronDown, Users, Settings, Building2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { SidebarLink } from "../Sidebar/SidebarLink";
import { fetchWithRefresh } from "../../services/api.service";
import styles from "./MenuSidebar.module.css";

interface Org {
  id: string;
  name: string;
}

export function MenuSidebar() {
  const location = useLocation();
  const [orgsOpen, setOrgsOpen] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    fetchWithRefresh("/api/orgs")
      .then(res => res.ok ? res.json() : [])
      .then(data => setOrgs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/orgs\/([^/]+)/);
    if (match) {
      setOrgsOpen(true);
      setExpandedOrgId(match[1]);
    }
  }, [location.pathname]);

  const isOrgRouteActive =
    location.pathname.startsWith("/orgs/") || location.pathname === "/organizations";

  return (
    <Sidebar>
      <SidebarLink to="/dashboard" icon={<Files />} label="Personal Space" matchStart />

      <button
        type="button"
        className={`${styles.orgsToggle} ${isOrgRouteActive ? styles.orgsToggleActive : ""}`}
        onClick={() => setOrgsOpen(o => !o)}
      >
        <span className={styles.toggleIcon}><Network size={20} /></span>
        <span className={styles.toggleLabel}>Organizations</span>
        <ChevronDown size={15} className={`${styles.chevron} ${orgsOpen ? styles.chevronOpen : ""}`} />
      </button>

      {orgsOpen && (
        <div className={styles.orgsList}>
          {orgs.length === 0 && (
            <span className={styles.emptyMsg}>No organizations yet</span>
          )}
          {orgs.map(org => (
            <div key={org.id}>
              <button
                type="button"
                className={`${styles.orgRow} ${expandedOrgId === org.id ? styles.orgRowActive : ""}`}
                onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
              >
                <span className={styles.orgRowIcon}><Building2 size={16} /></span>
                <span className={styles.orgRowName}>{org.name}</span>
                <ChevronDown size={13} className={`${styles.chevron} ${expandedOrgId === org.id ? styles.chevronOpen : ""}`} />
              </button>

              {expandedOrgId === org.id && (
                <div className={styles.orgSubLinks}>
                  <SidebarLink to={`/orgs/${org.id}/files`} icon={<Files size={16} />} label="Files" />
                  <SidebarLink to={`/orgs/${org.id}/members`} icon={<Users size={16} />} label="Members" />
                  <SidebarLink to={`/orgs/${org.id}/settings`} icon={<Settings size={16} />} label="Settings" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Sidebar>
  );
}
