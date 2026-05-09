import { ActionButtons } from "../ActionButtons";
import styles from "./OrgHeader.module.css";

interface OrgHeaderProps {
  orgName?: string;
  showActionButtons?: boolean;
  onUploadFile?: (file: File) => void;
}

export function OrgHeader({ orgName, showActionButtons = false, onUploadFile }: OrgHeaderProps) {
  return (
    <div className={styles.pageHeader}>
        {orgName && <p className={styles.orgBadge}>Organization: {orgName}</p>}
        {showActionButtons && <ActionButtons onUploadFile={onUploadFile} />}
    </div>
  )
}