import styles from "./ConfirmationModal.module.css";
import { useState } from "react";

interface ConfirmationModalProps {
    isOpen: boolean;
    fileName: string;
    onConfirm: () => void;
    onCancel: () => void;
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
    isPasswordChanged?: boolean;
    isKeyMissing?: boolean;
    isDeleteFile?: boolean;
    isDeleteFolder?: boolean;
    isCreateFolder?: boolean;
    isRenameFolder?: boolean;
    isMove?: boolean;
    orgId?: string;
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    fileName,
    onConfirm,
    onCancel,
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
    isDeleteOrga = false,
    isPasswordChanged = false,
    isKeyMissing = false,
    isDeleteFile = false,
    isDeleteFolder = false,
    isCreateFolder = false,
    isRenameFolder = false,
    isMove = false,
    isLoading: externalIsLoading = false,
}: ConfirmationModalProps) {

    const [internalLoading, setInternalLoading] = useState(false);
    
    const isLoading = externalIsLoading || internalLoading;
    
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
    } else if (isDeleteFile) {
    title = "Delete File?"
    } else if (isDeleteFolder) {
    title = "Delete Folder?"
    } else if (isCreateFolder) {
    title="Create Folder"
    } else if (isRenameFolder) {
    title = "Rename Folder?";
    } else if (isMove) {
    title = "Move location?";
    } else if (isPasswordChanged) {
    title = "Password Updated";
    } else if (isKeyMissing) {
    title = "Enter your password";
    } else {
    title = "Confirmation";
    }

    const message: string | undefined = isAccount
    ? "Are you sure you want to permanently delete your account? This action cannot be undone."
    : isDeleteFile
    ? `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`
    : isDeleteFolder
    ? `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`
    : isLeaveOrga && isMe
    ? `Are you sure you want to leave "${fileName}"?`
    : isChangeRole
    ? `Change ${fileName}'s role to ${newRole}?`
    : isRemoveMember
    ? `Are you sure you want to remove "${fileName}" from this organization?`
    : isDeleteOrga
    ? `Are you sure you want to permanently delete the organization, "${fileName}"? This action cannot be undone.`
    : isPasswordChanged
    ? "Your password has been successfully updated."
    : isKeyMissing
    ? "To complete this action, enter your password."
    : isAddMember
    ? "Enter the email of the new member."
    : isCreateOrga
    ? "Enter the name of the new organization"
    : isCreateFolder
    ? "Enter the name of the folder you want to create:"
    : isRenameFolder
    ? `Enter a new name for the folder "${fileName}":`
    : isMove
    ? `Enter the id of the new target folder for "${fileName}":`
    : undefined

    const baseButtonText = isAccount
    ? "Delete Account"
    : isDeleteFile || isDeleteFolder
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
    : isPasswordChanged
    ? "Confirm"
    : isKeyMissing
    ? "Confirm"
    : isCreateFolder
    ? "Create Folder"
    : isMove
    ? "Move item"
    : isRenameFolder
    ? "Rename Folder"
    : "Confirm";

    const buttonText = isLoading ? "Loading..." : baseButtonText;   

    const handleConfirm = async () => {
        if (isLoading) return;
        
        setInternalLoading(true);
        try {
            await onConfirm();
        } finally {
            setInternalLoading(false);
        }
    };

    return (
        <>
            <div className={styles.modal__overlay} 
                onClick={() => {
                    if (isLoading) return;
                    onInputChange?.("");
                    onCancel();
                }} />
            <div className={styles.modal}>
                <h2 className={styles.modal__title}>{title}</h2>
                {message && <p className={styles.modal__message}>{message}</p>}
                {(isCreateOrga || isAddMember || isKeyMissing || isCreateFolder || isRenameFolder || isMove) && (
                <input
                    type={isAddMember ? "email" : isKeyMissing ? "password" : "text"}
                    placeholder={isCreateOrga ? "Organization name" : isKeyMissing ? "Password" : isCreateFolder ? "Folder Name" : isRenameFolder ? "New Folder Name" : isMove ? "Folder ID" : "User email"}
                    value={inputValue}
                    onChange={(e) => onInputChange?.(e.target.value)}
                    className={styles.modal__input}
                    disabled={isLoading}
                />
                )}

                {errorMessage && (
                <p className={styles.modal__error}>{errorMessage}</p>
                )}
                <div className={styles.modal__actions}>
                    { !isPasswordChanged && (<button className={`${styles.modal__button} ${styles["modal__button--cancel"]}`} 
                          onClick={() => {
                            onInputChange?.("");
                            onCancel();
                        }} disabled={isLoading}>
                        Cancel
                    </button>)}
                    <button className={`${styles.modal__button} ${styles["modal__button--confirm"]}`} onClick={handleConfirm} disabled={isLoading}>
                        {buttonText}
                    </button>
                </div>
            </div>
        </>
    );
}

