import { Shield, FolderOpen, Database } from "lucide-react";
import { StatusDot } from "./StatusDot";
import type { ServiceStatus, ServiceState } from "../../types/health";
import styles from "../../styles/status.module.css";

const SERVICE_META = {
	auth: {
		label: "Authentication",
		description: "Login, registration, session management",
		icon: Shield,
	},
	orga: {
		label: "Organizations",
		description: "Team workspaces and member access",
		icon: FolderOpen,
	},
	storage: {
		label: "Storage",
		description: "File uploads, downloads, encryption",
		icon: Database,
	},
} as const;

const STATE_LABEL: Record<ServiceState, string> = {
	ok:      "Operational",
	degraded:"Degraded",
	error:   "Outage",
	unknown: "Unknown",
};

function getServiceState(s: ServiceStatus): ServiceState {
	if (!s.liveness || !s.readiness) return "error";
	if (s.degraded) return "degraded";
	return "ok";
}

interface ServiceRowProps {
	name: keyof typeof SERVICE_META;
	status: ServiceStatus | undefined;
	aggregatorUp: boolean | null;
}

export function ServiceRow({ name, status, aggregatorUp }: ServiceRowProps) {
	const { label, description, icon: Icon } = SERVICE_META[name];
	const state: ServiceState = aggregatorUp === false
		? "unknown"
		: status ? getServiceState(status) : "unknown";

	return (
		<div className={styles.service_row}>
			<div className={styles.service_icon_box}>
				<Icon size={18} color="var(--brand-primary)" strokeWidth={2} />
			</div>

			<div className={styles.service_info}>
				<span className={styles.service_name}>{label}</span>
				<span className={styles.service_description}>{description}</span>
			</div>

			<div className={styles.service_state}>
				<StatusDot state={state} />
				<span className={`${styles.service_state_label} ${styles[`state_${state}`]}`}>
					{STATE_LABEL[state]}
				</span>
			</div>
		</div>
	);
}
