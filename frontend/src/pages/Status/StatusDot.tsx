import type { ServiceState } from "../../types/health";
import styles from "../../styles/status.module.css";

const DOT_COLOR: Record<ServiceState, string> = {
	ok:      "#22c55e",
	degraded:"#f59e0b",
	error:   "#ef4444",
	unknown: "#d1d5db",
};

interface StatusDotProps {
	state: ServiceState;
	pulse?: boolean;
}

export function StatusDot({ state, pulse = false }: StatusDotProps) {
	const color = DOT_COLOR[state];
	return (
		<span
			className={`${styles.dot} ${pulse ? styles.dot_pulse : ""}`}
			style={{ background: color, boxShadow: `0 0 0 2px ${color}33` }}
		/>
	);
}
