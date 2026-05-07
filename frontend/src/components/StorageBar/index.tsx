import styles from "./StorageBar.module.css";

interface StorageBarProps {
  usedBytes: number;
  totalBytes: number;
}

export function StorageBar({ usedBytes, totalBytes }: StorageBarProps) {
  const used = (usedBytes / 1024 / 1024 / 1024).toFixed(2);
  const total = (totalBytes / 1024 / 1024 / 1024).toFixed(2);
  const percent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
  const color = percent > 90 ? "#d32f2f" : percent > 70 ? "#f57c00" : "var(--brand-primary)";

  return (
    <>
      <div className={styles.storageBar}>
        <div
          className={styles.storageBarFill}
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <p className={styles.spaceUsage}>{used} GB / {total} GB</p>
    </>
  );
}