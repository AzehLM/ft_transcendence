import styles from "../../components/FileGrid/FileGrid.module.css";
import type { ReactNode } from "react";
import { OrgHeader } from "../../components/OrgHeader";

interface OrgLayoutProps {
  title: string;
  orgName?: string;
  orgDesc?: string;
  children: ReactNode;
  showActionButtons?: boolean;
}


export function OrgLayout({ title, orgName, orgDesc, showActionButtons = false, children }: OrgLayoutProps) {

  return (
        <div className={styles.page}>
          <OrgHeader orgName={orgName} orgDesc={orgDesc} showActionButtons={showActionButtons} />
          <div className={styles.contentArea}>
            <h1 className={styles.title}>{title}</h1>
            <div>
                {children}
            </div>
          </div>
        </div>
  );
}