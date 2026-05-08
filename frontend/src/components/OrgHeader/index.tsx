import { ActionButtons } from "../ActionButtons";
import styles from "./OrgHeader.module.css";

interface OrgHeaderProps {
  orgName?: string;
  showActionButtons?: boolean;
}

export function OrgHeader({ orgName, showActionButtons = false }: OrgHeaderProps) {
  return (
    <div className={styles.pageHeader}>
        {orgName && <p className={styles.orgBadge}>Organization: {orgName}</p>}
        {showActionButtons && <ActionButtons />}
    </div>
  )
}