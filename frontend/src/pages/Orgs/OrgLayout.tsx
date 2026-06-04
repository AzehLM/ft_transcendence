import type { ReactNode } from "react";
import styles from "./OrgLayout.module.css"
import { Building2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface OrgLayoutProps {
  orgName?: string;
  orgDesc?: string;
  children: ReactNode;
}


export function OrgLayout({ orgName, orgDesc, children }: OrgLayoutProps) {
  return (
    <div>
      <div className={styles.header}>
        <Building2
          size={22}
          className={styles.logo}
        />
          <Link to="/organizations" className={styles.org}>Organizations</Link>
          <ChevronRight size={14} className={styles.separator} />
          {orgName && <span className={styles.orgName}>{orgName}</span>}

          {orgDesc && (
            <span className={styles.orgDesc}> ({orgDesc})</span>
          )}
      </div>

      <div className={styles.childrenArea}>
        {children}
      </div>
    </div>
  );
}