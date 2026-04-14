import styles from "./DeleteConfirmationModal.module.css";

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
            <div className={styles.modal__overlay} onClick={onCancel} />
            <div className={styles.modal}>
                <h2 className={styles.modal__title}>{title}</h2>
                {message && <p className={styles.modal__message}>{message}</p>}
                <div className={styles.modal__actions}>
                    <button className={`${styles.modal__button} ${styles["modal__button--cancel"]}`} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={`${styles.modal__button} ${styles["modal__button--delete"]}`} onClick={onConfirm}>
                        {buttonText}
                    </button>
                </div>
            </div>
        </>
    );
}

