import { ActionButtons } from "../ActionButtons";
import styles from "./OrgHeader.module.css";

interface OrgHeaderProps {
  orgName?: string;
  orgDesc?: string;
  showActionButtons?: boolean;
  onUploadFile?: (file: File) => void;
  onCreateFolder?: () => void;
}

export function OrgHeader({
  orgName,
  orgDesc, 
  showActionButtons = false,
  onUploadFile,
  onCreateFolder
}: OrgHeaderProps) {
  return (
    <div className={styles.pageHeader}>
        {orgName && <p className={styles.orgBadge}>Organization: {orgName}</p>}
        {orgDesc && <p className={styles.orgDesc}>{orgDesc}</p>}
        {showActionButtons && (
          <ActionButtons
            onUploadFile={onUploadFile}
            onCreateFolder={onCreateFolder}
          />
        )}
    </div>
  )
}