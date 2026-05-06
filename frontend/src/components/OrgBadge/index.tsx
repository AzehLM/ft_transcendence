import styles from "./OrgBadge.module.css";

interface OrgBadgeProps {
  orgName?: string;
}

export function OrgBadge({ orgName }: OrgBadgeProps) {
  if (!orgName) return null;
  return <p className={styles.orgBadge}>Organization: {orgName}</p>;
}