import styles from "../../components/FileGrid/FileGrid.module.css";
import type { ReactNode } from "react";
import { OrgHeader } from "../../components/OrgHeader";
import orgaStyles from "./OrgLayout.module.css"

interface OrgLayoutProps {
  title: string;
  orgName?: string;
  orgDesc?: string;
  children: ReactNode;
  showActionButtons?: boolean;
}


export function OrgLayout({ title, orgName, orgDesc, showActionButtons = false, children }: OrgLayoutProps) {
  const hasHeaderContent = orgName || orgDesc || showActionButtons;

  return (
        <div className={styles.page}>
          {hasHeaderContent && <OrgHeader orgName={orgName} orgDesc={orgDesc} showActionButtons={showActionButtons} />}
          <div className={hasHeaderContent ? styles.contentArea : styles.contentAreaNoButtons}>
            {title && <h1 className={styles.title}>{title}</h1>}
            <div className={orgaStyles.childrenArea}>
                {children}
            </div>
          </div>
        </div>
  );
}