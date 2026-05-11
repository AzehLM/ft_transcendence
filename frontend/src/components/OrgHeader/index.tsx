import { ActionButtons } from "../ActionButtons";
import styles from "./OrgHeader.module.css";

interface OrgHeaderProps {
  orgName?: string;
  orgDesc?: string;
  showActionButtons?: boolean;
}

export function OrgHeader({ orgName, orgDesc, showActionButtons = false }: OrgHeaderProps) {
  return (
    <div className={styles.pageHeader}>
        {orgName && <p className={styles.orgBadge}>Organization: {orgName}</p>}
        {orgDesc && <p className={styles.orgDesc}>{orgDesc}</p>}
        {showActionButtons && <ActionButtons />}
    </div>
  )
}