import styles from "../styles/components.module.css";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    fileName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmationModal({
    isOpen,
    fileName,
    onConfirm,
    onCancel,
}: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <>
            <div className={styles.modalOverlay} onClick={onCancel} />
            <div className={styles.modal}>
                <h2 className={styles.modalTitle}>Delete File?</h2>
                <p className={styles.modalMessage}>
                    Are you sure you want to delete "{fileName}"? This action cannot be undone.
                </p>
                <div className={styles.modalActions}>
                    <button className={styles.modalButtonCancel} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={styles.modalButtonDelete} onClick={onConfirm}>
                        Delete
                    </button>
                </div>
            </div>
        </>
    );
}
