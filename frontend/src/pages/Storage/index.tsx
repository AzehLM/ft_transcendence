import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { StorageBar } from "../../components/StorageBar";
import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";

export default function StoragePage() {

    const [usedSpace, setUsedSpace] = useState<number>(0);
    const [maxSpace, setMaxSpace] = useState<number>(0);
    useEffect(() => {
    fetchWithRefresh("/api/auth/me")
        .then(res => res.json())
        .then(data => {
            if (data) {
            setUsedSpace(data.used_space);
            setMaxSpace(data.max_space);
            }
      })
    }, []);

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
                    <StorageBar usedBytes={usedSpace} totalBytes={maxSpace} />
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