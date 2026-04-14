import styles from "../styles/components.module.css";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    fileName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isTrash?: boolean;
}

export function DeleteConfirmationModal({
    isOpen,
    fileName,
    onConfirm,
    onCancel,
    isTrash = false,
}: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    const title = isTrash ? "Delete File?" : "Move to Trash?";
    const message = isTrash
        ? `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`
        : undefined;
    const buttonText = isTrash ? "Delete" : "Move to Trash";

    return (
        <>
            <div className={styles.modalOverlay} onClick={onCancel} />
            <div className={styles.modal}>
                <h2 className={styles.modalTitle}>{title}</h2>
                {message && <p className={styles.modalMessage}>{message}</p>}
                <div className={styles.modalActions}>
                    <button className={styles.modalButtonCancel} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={styles.modalButtonDelete} onClick={onConfirm}>
                        {buttonText}
                    </button>
                </div>
            </div>
        </>
    );
}
