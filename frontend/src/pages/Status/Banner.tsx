import { StatusDot } from "./StatusDot";
import type { ServiceState } from "../../types/health";
import styles from "../../styles/status.module.css";

const BANNER_CONFIG: Record<ServiceState, { text: string; className: string }> = {
	ok:      { text: "All systems operational",                          className: styles.banner_ok },
	degraded:{ text: "Some services are experiencing issues",           className: styles.banner_degraded },
	error:   { text: "Service disruption detected",                     className: styles.banner_error },
	unknown: { text: "Status unavailable — unable to reach health service", className: styles.banner_unknown },
};

interface BannerProps {
	status: ServiceState;
}

export function Banner({ status }: BannerProps) {
	const { text, className } = BANNER_CONFIG[status];
	return (
		<div className={`${styles.banner} ${className}`}>
			<StatusDot state={status} />
			<span className={styles.banner_text}>{text}</span>
		</div>
	);
}
