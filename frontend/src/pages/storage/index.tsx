import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";

export default function ProfilePage() {

    // GET FROM BACK
    const used = 3;
    const total = 10;
    const percent = (used / total) * 100;

    // GET FROM BACK
    const USAGE_TYPES = [
    { label: "Documents", value: "X GB" },
    { label: "Images",    value: "X GB" },
    { label: "Videos",    value: "X GB" },
    { label: "Others",    value: "X GB" },
    ];

    return (

        <SettingsLayout>
            <div className={styles.storageBoxes}>
                <div className={styles.mainBox}>
                    <h2 className={styles.subtitle}>Storage Usage</h2>
                <div className={styles.storageBar}>
                <div
                    className={styles.storageBarFill}
                    style={{ width: `${percent}%` }}
                />
                </div>
                <p className={styles.spaceUsage}>{used} GB / {total} GB</p>
                </div>
                <div className={styles.mainBox}>
                    <h2 className={styles.subtitle}>Storage by Type</h2>
                    <div className={styles.usageType}>
                    {USAGE_TYPES.map((type, index) => {
                        const opacity = 1 - (index / USAGE_TYPES.length);
                        return (
                        <div key={type.label} className={styles.usageTypeInfo}>
                            <div className={styles.bullet}>
                            <span
                                className={styles.bulletDot}
                                style={{ backgroundColor: `rgba(213, 79, 42, ${opacity})` }}
                            />
                            <p>{type.label}</p>
                            </div>
                            <p>{type.value}</p>
                        </div>
                        );
                    })}
                    </div>
                </div>
            </div>
        </SettingsLayout>
    );
}