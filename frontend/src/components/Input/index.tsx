import styles from "../../styles/auth.module.css"

export function InputField({
    label,
    type = "text",
    icon: Icon,
    placeholder,
    value,
    onChange
}: {
    label: string;
    type?: string;
    icon: any;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className={styles.input_field_wrapper}>
            <label className={styles.input_label}>
                {label}
            </label>
            <div className={styles.input_container}>
                <div className={styles.input_icon}>
                    <Icon className="w-6 h-6" />
                </div>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className={styles.input_field}
                />
            </div>
        </div>
    );
}
