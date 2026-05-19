import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import styles from "./EditableField.module.css";

interface EditableFieldProps {
  label: string;
  value: string;
  role?: string | null;
  maxCarac: number;
  isOrgaName?: boolean;
  isOrgaDesc?: boolean;
  isUserNames?: boolean;
  onSave: (newValue: string) => Promise<void>;
  handleReset?: () => Promise<void>;
}

export function EditableField({ label, value, role, maxCarac, isOrgaName = false, isOrgaDesc = false, isUserNames = false, onSave, handleReset }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!inputValue.trim() || inputValue === value) {
      setEditing(false);
      return;
    }
    if (inputValue.length > maxCarac) {
        setError(`The input cannot exceed ${maxCarac} caracters`)
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
              autoFocus
            />
            <button className={styles.iconButton} onClick={handleSave} disabled={loading}>
              <Check size={18} />
            </button>
            <button className={styles.iconButton} onClick={handleCancel}>
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            { isOrgaName  && (
              <p className={styles.value}>{value}</p> 
            )}
            { ((isOrgaDesc || isUserNames) && value !== "") && (
              <>
                <p className={styles.value}>{value}</p>
                <button className={styles.iconButton} onClick={handleReset}>
                  <X size={18} />
                </button> 
              </>
            )}
            { isOrgaDesc && value === "" && (
              <p className={styles.novalue}>No description yet, you can add one!</p>
            )}
            { isUserNames && value === "" && (
              <p className={styles.novalue}>No name yet, you can add one!</p>
            )}
            <button className={styles.iconButton} onClick={() => { setInputValue(value); setEditing(true); }}>
              <Pencil size={18} />
            </button>
          </>
        )}
      </div>)}
        { (role !== "admin" && isOrgaName) && (<div className={styles.row}>
            <p className={styles.value}>{value}</p>
      </div>)}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}