import styles from "../styles/components.module.css";

export function FileCard({ name }: { name: string }) {
  return (
    <div className={styles.fileCard}>
      <div className={styles.fileCardBackground} />
      <div className={styles.fileCardBlur} />
      <div className={styles.fileCardName}>
        {name}
      </div>
    </div>
  );
}