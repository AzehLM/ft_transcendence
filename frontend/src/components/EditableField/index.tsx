import { useRef, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import styles from "./EditableField.module.css";

interface EditableFieldProps {
  label: string;
  value: string;
  role?: string | null;
  maxCharac: number;
  isOrgaName?: boolean;
  isOrgaDesc?: boolean;
  isUserNames?: boolean;
  onSave: (newValue: string) => Promise<void>;
  handleReset?: () => Promise<void>;
}

export function EditableField({ label, value, role, maxCharac, isOrgaName = false, isOrgaDesc = false, isUserNames = false, onSave, handleReset }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const handleSave = async () => {
    if (!inputValue.trim() || inputValue === value) {
      setEditing(false);
      return;
    }
    if (inputValue.length > maxCharac) {
        setError(`The input cannot exceed ${maxCharac} characters`)
        return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(inputValue);
      setEditing(false);
    } catch {
      setError("Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setInputValue(value);
    setEditing(false);
    setError(null);
  };

  return (
    <div className={styles.container}>
      <p className={styles.label}>{label}</p>
      { ((isOrgaName && role === "admin") || isOrgaDesc || isUserNames) && (<div className={styles.row}>
        {editing ? (
          <>
            <input
              className={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              onBlur={(e) => {
                const target = e.relatedTarget as Node | null;
                if (saveButtonRef.current?.contains(target) || cancelButtonRef.current?.contains(target)) return;
                handleSave();
              }}
              autoFocus
            />
            <button
              ref={saveButtonRef}
              type="button"
              className={styles.iconButton}
              onClick={handleSave}
              disabled={loading}
            >
              <Check size={18} />
            </button>
            { handleReset && (
              <button
                ref={cancelButtonRef}
                type="button"
                className={styles.iconButton}
                onClick={handleCancel}
              >
                <X size={18} />
              </button>
            )}
          </>
        ) : (
          <div className={styles.fieldWrapper} onClick={() => { setInputValue(value); setEditing(true); }}>
            { isOrgaName && (
              <p className={styles.value}>{value}</p>
            )}
            { (isOrgaDesc || isUserNames) && value !== "" && (
              <p className={styles.value}>{value}</p>
            )}
            { isOrgaDesc && value === "" && (
              <p className={styles.novalue}>No description yet, you can add one!</p>
            )}
            { isUserNames && value === "" && (
              <p className={styles.novalue}>No name yet, you can add one!</p>
            )}
            <div className={styles.fieldActions}>
              { (isOrgaDesc || isUserNames) && value !== "" && (
                <button className={styles.iconButton} onClick={(e) => { e.stopPropagation(); handleReset?.(); }}>
                  <X size={16} />
                </button>
              )}
              <button className={styles.iconButton} onClick={() => { setInputValue(value); setEditing(true); }}>
                <Pencil size={16} />
              </button>
            </div>
          </div>
        )}
      </div>)}
        { (role !== "admin" && isOrgaName) && (<div className={styles.row}>
            <p className={styles.value}>{value}</p>
      </div>)}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}