import styles from "./ConfirmationModal.module.css";

interface ConfirmationModalProps {
    isOpen: boolean;
    fileName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isTrash?: boolean;
    isAccount?: boolean;
    isLeaveOrga?: boolean;
    isMe?: boolean;
    isAddMember?: boolean;
    isCreateOrga?: boolean;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    errorMessage?: string;
    isChangeRole?: boolean;
    newRole?: string;
    isRemoveMember?: boolean;
    isDeleteOrga?: boolean;
}

export function ConfirmationModal({
    isOpen,
    fileName,
    onConfirm,
    onCancel,
    isTrash = false,
    isAccount = false,
    isLeaveOrga = false,
    isMe = false,
    isAddMember = false,
    isCreateOrga = false,
    inputValue,
    onInputChange,
    errorMessage,
    isChangeRole = false,
    newRole,
    isRemoveMember = false, 
    isDeleteOrga = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    let title: string;

    if (isAccount) {
    title = "Delete Account?";
    } 
    else if (isLeaveOrga && isMe) {
    title = "Leave Organization?"
    } else if (isAddMember) {
    title = "Add Member?";
    } else if (isCreateOrga) {
    title = "Create Organization?";
    } else if (isChangeRole) {
    title = "Change Role?";
    } else if (isRemoveMember) {
    title = "Remove Member?";
    } else if (isDeleteOrga) {
    title = "Delete Organization?";
    } else if (isTrash) {
    title = "Delete File?";
    } else {
    title = "Move to Trash?";
    }

    const message: string | undefined = isAccount
    ? "Are you sure you want to permanently delete your account? This action cannot be undone."
    : isTrash
    ? `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`
    : isLeaveOrga && isMe
    ? `Are you sure you want to leave "${fileName}"?`
    : isChangeRole
    ? `Change ${fileName}'s role to ${newRole}?`
    : isRemoveMember
    ? `Are you sure you want to remove "${fileName}" from this organization?`
    : isDeleteOrga
    ? `Are you sure you want to permanently delete the organization, "${fileName}"? This action cannot be undone.`
    : undefined

    const buttonText = isAccount
    ? "Delete Account"
    : isTrash
    ? "Delete"
    : isLeaveOrga && isMe
    ? "Leave Organization"
    : isAddMember
    ? "Add Member"
    : isCreateOrga
    ? "Create Organization"
    : isChangeRole
    ? "Change Role"
    : isRemoveMember
    ? "Remove"
    : isDeleteOrga
    ? "Delete Organization"
    : "Move to Trash";
    
    return (
        <>
            <div className={styles.modal__overlay} onClick={onCancel} />
            <div className={styles.modal}>
                <h2 className={styles.modal__title}>{title}</h2>
                {message && <p className={styles.modal__message}>{message}</p>}
                {(isCreateOrga || isAddMember) && (
                <input
                    type={isAddMember ? "email" : "text"}
                    placeholder={isCreateOrga ? "Organization name" : "User email"}
                    value={inputValue}
                    onChange={(e) => onInputChange?.(e.target.value)}
                    className={styles.modal__input}
                />
                )}

                {errorMessage && (
                <p className={styles.modal__error}>{errorMessage}</p>
                )}
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

