import styles from "../../styles/profile.module.css";
import { SettingsLayout } from "../Profile/SettingsLayout";

export default function ProfilePage() {

    return (

        <SettingsLayout>
          <h2 className={styles.subtitle}>Storage</h2>
        </SettingsLayout>
    );
}