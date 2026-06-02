import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";
import { StorageBar } from "../../components/StorageBar";
import { useEffect, useState } from "react";
import { fetchWithRefresh } from "../../services/api.service";

export default function StoragePage() {

    const [usedSpace, setUsedSpace] = useState<number>(0);
    const [maxSpace, setMaxSpace] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    fetchWithRefresh("/api/auth/me")
        .then(res => {
        if (!res.ok) {
            setError("Failed to fetch storage information.")
            throw new Error("Failed to fetch user");
        }
        return res.json();
        })
        .then(data => {
            if (data) {
            setUsedSpace(data.used_space);
            setMaxSpace(data.max_space);
            }
        })
        .catch(() => {
            setError("Failed to fetch storage information.")
        });
    }, []);


    return (

        <SettingsLayout>
            <div className={styles.storageBoxes}>
                <div className={styles.mainBox}>
                    <h2 className={styles.subtitle}>Storage Usage</h2>
                    { error ? (
                    <div className={`${styles.statusMessage} ${styles.error}`}>
                        {error}
                    </div>
                    ) : (
                    <StorageBar usedBytes={usedSpace} totalBytes={maxSpace} />
                )}
                </div>
            </div>
        </SettingsLayout>
    );
}