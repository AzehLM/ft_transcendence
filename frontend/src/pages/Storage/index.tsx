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


    return (

        <SettingsLayout>
            <div className={styles.storageBoxes}>
                <div className={styles.mainBox}>
                    <h2 className={styles.subtitle}>Storage Usage</h2>
                    <StorageBar usedBytes={usedSpace} totalBytes={maxSpace} />
                </div>
            </div>
        </SettingsLayout>
    );
}