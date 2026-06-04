import { useRef, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import styles from "./EditableField.module.css";
import { organizationSchema, organizationDescriptionSchema } from "../../schemas/organization.schema";
import { firstNameSchema, familyNameSchema } from "../../schemas/names.schema";

interface EditableFieldProps {
  label: string;
  value: string;
  role?: string | null;
  isOrgaName?: boolean;
  isOrgaDesc?: boolean;
  isFirstName?: boolean;
  isFamilyName?: boolean;
  onSave: (newValue: string) => Promise<void>;
  handleReset?: () => Promise<void>;
}

export function EditableField({ label, value, role, isOrgaName = false, isOrgaDesc = false, isFirstName = false, isFamilyName = false, onSave, handleReset }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);


  const handleSave = async () => {
      if (inputValue.trim() === value.trim()) {
          setEditing(false);
          return;
      }

      const schema = isOrgaName ? organizationSchema
          : isOrgaDesc ? organizationDescriptionSchema
          : isFirstName ? firstNameSchema
          : familyNameSchema;

      const field = isOrgaName ? "name"
          : isOrgaDesc ? "description"
          : isFirstName ? "firstName"
          : "familyName"

      const result = schema.safeParse({ [field]: inputValue });
      if (!result.success) {
          setError(result.error.issues[0].message);
          return;
      }

      setLoading(true);
      setError(null);
      try {
          await onSave(result.data[field as keyof typeof result.data]);
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
      { ((isOrgaName && role === "admin") || isOrgaDesc || isFirstName || isFamilyName) && (<div className={styles.row}>
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
            { (isOrgaDesc || isFirstName || isFamilyName) && value !== "" && (
              <p className={styles.value}>{value}</p>
            )}
            { isOrgaDesc && value === "" && (
              <p className={styles.novalue}>No description yet, you can add one!</p>
            )}
            { isFirstName && value === "" && (
              <p className={styles.novalue}>No name yet, you can add one!</p>
            )}
            { isFamilyName && value === "" && (
              <p className={styles.novalue}>No name yet, you can add one!</p>
            )}
            <div className={styles.fieldActions}>
              { (isOrgaDesc || isFirstName || isFamilyName) && value !== "" && (
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
