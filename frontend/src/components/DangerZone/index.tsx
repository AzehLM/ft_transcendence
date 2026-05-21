import { useState } from "react";
import { ConfirmationModal } from "../ConfirmationModal";
import styles from "./DangerZone.module.css";

interface DangerZoneProps {
  label: string;
  description?: string;
  buttonText: string;
  fileName: string;
  onConfirm: () => void;
  isAccount?: boolean;
  isDeleteOrga?: boolean;
  error?: string | null;
}

export function DangerZone({ label, description, buttonText, fileName, onConfirm, isAccount, isDeleteOrga, error }: DangerZoneProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className={styles.deleteBox}>
      <p className={styles.dangerTitle}>Danger Zone</p>
      <div className={styles.dangerRow}>
        <div>
          <p className={styles.dangerLabel}>{label}</p>
          {description && <p className={styles.dangerDescription}>{description}</p>}
        </div>
        <button className={styles.buttonDelete} onClick={() => setShowConfirm(true)}>
          {buttonText}
        </button>
      </div>
      {error && <p className={styles.errorMessage}>{error}</p>}
      <ConfirmationModal
        isOpen={showConfirm}
        fileName={fileName}
        onConfirm={() => { onConfirm(); setShowConfirm(false); }}
        onCancel={() => setShowConfirm(false)}
        isAccount={isAccount}
        isDeleteOrga={isDeleteOrga}
      />
    </div>
  );
}