import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import styles from "./EditableField.module.css";

interface EditableFieldProps {
  label: string;
  value: string;
  role: string | null;
  onSave: (newValue: string) => Promise<void>;
}

export function EditableField({ label, value, role, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!inputValue.trim() || inputValue === value) {
      setEditing(false);
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
      { role === "admin" && (<div className={styles.row}>
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
            <p className={styles.value}>{value}</p>
            <button className={styles.iconButton} onClick={() => setEditing(true)}>
              <Pencil size={18} />
            </button>
          </>
        )}
      </div>)}
        { role !== "admin" && (<div className={styles.row}>
            <p className={styles.value}>{value}</p>
      </div>)}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}