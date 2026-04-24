import { useEffect, useState } from "react";
import { Package, Shield, Database, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "../../styles/auth.module.css";

interface ServiceStatus {
	liveness: boolean;
	readiness: boolean;
	degraded: boolean;
}

interface HealthResponse {
	status: "ok" | "degraded" | "error";
	services: {
		auth: ServiceStatus;
		orga: ServiceStatus;
		storage: ServiceStatus;
	};
}

type ServiceState = "ok" | "degraded" | "error" | "unknown";

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

const STATE_CONFIG: Record<ServiceState, { label: string; color: string; dot: string }> = {
	ok:      { label: "Operational", color: "#15803d", dot: "#22c55e" },
	degraded:{ label: "Degraded",    color: "#b45309", dot: "#f59e0b" },
	error:   { label: "Outage",      color: "#b91c1c", dot: "#ef4444" },
	unknown: { label: "Unknown",     color: "#9ca3af", dot: "#d1d5db" },
};

const BANNER_CONFIG = {
	ok:      { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", text: "All systems operational" },
	degraded:{ bg: "#fffbeb", border: "#fde68a", color: "#b45309", text: "Some services are experiencing issues" },
	error:   { bg: "#fff1f2", border: "#fecdd3", color: "#b91c1c", text: "Service disruption detected" },
	unknown: { bg: "#f5f5f5", border: "#e5e5e5", color: "#6b7280", text: "Status unavailable — unable to reach monitoring service" },
};

function getServiceState(s: ServiceStatus): ServiceState {
	if (!s.liveness || !s.readiness) return "error";
	if (s.degraded) return "degraded";
	return "ok";
}

function StatusDot({ state }: { state: ServiceState }) {
	const color = STATE_CONFIG[state].dot;
	return (
		<span style={{
			display: "inline-block",
			width: 8,
			height: 8,
			borderRadius: "50%",
			background: color,
			boxShadow: `0 0 0 2px ${color}33`,
			flexShrink: 0,
		}} />
	);
}

function Banner({ status }: { status: keyof typeof BANNER_CONFIG }) {
	const c = BANNER_CONFIG[status];
	return (
		<div style={{
			background: c.bg,
			border: `1px solid ${c.border}`,
			borderRadius: "var(--radius-sm)",
			padding: "14px 18px",
			display: "flex",
			alignItems: "center",
			gap: 10,
			marginBottom: 24,
		}}>
			<StatusDot state={status === "unknown" ? "unknown" : status} />
			<span style={{ color: c.color, fontWeight: 500, fontSize: "var(--text-sm)" }}>
				{c.text}
			</span>
		</div>
	);
}

function ServiceRow({ name, status,	aggregatorUp, }: { name: keyof typeof SERVICE_META;	status: ServiceStatus | undefined; aggregatorUp: boolean | null; }) {
	const meta = SERVICE_META[name];
	const Icon = meta.icon;

	const state: ServiceState = aggregatorUp === false ? "unknown" : status ? getServiceState(status) : "unknown";

	const { label, color } = STATE_CONFIG[state];

	return (
		<div style={{
			display: "flex",
			alignItems: "center",
			gap: 16,
			padding: "18px 0",
			borderBottom: "1px solid rgba(43, 16, 8, 0.08)",
		}}>
			<div style={{
				width: 40,
				height: 40,
				borderRadius: 10,
				background: "rgba(222, 115, 86, 0.12)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
			}}>
				<Icon size={18} color="var(--brand-primary)" strokeWidth={2} />
			</div>

			<div style={{ flex: 1 }}>
				<div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--brand-dark)" }}>
					{meta.label}
				</div>
				<div style={{ fontSize: 12, color: "var(--brand-dark)", opacity: 0.5, marginTop: 2 }}>
					{meta.description}
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
				<StatusDot state={state} />
				<span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color }}>
					{label}
				</span>
			</div>
		</div>
	);
}

export default function StatusPage() {
	const [health, setHealth] = useState<HealthResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [aggregatorUp, setAggregatorUp] = useState<boolean | null>(null);

	const fetchHealth = async () => {
		try {
			const res = await fetch("/api/health");
			const data: HealthResponse = await res.json();
			setAggregatorUp(true);
			setHealth(data);
		} catch {
			setAggregatorUp(false);
			setHealth(null);
		} finally {
			setLoading(false);
			setLastUpdated(new Date());
		}
	};

	useEffect(() => {
		fetchHealth();
		const interval = setInterval(fetchHealth, 57_000);
		return () => clearInterval(interval);
	}, []);

	const bannerStatus: keyof typeof BANNER_CONFIG | null = loading ? null : aggregatorUp === false ? "unknown" : health?.status ?? null;

	return (
		<div className={styles.login_page_wrapper} style={{ background: "linear-gradient(to bottom right, #fef9f7, white)", alignItems: "flex-start", paddingTop: 64 }}>
			<div className={styles.login_page_container} style={{ maxWidth: 520 }}>

				{/* Logo */}
				<div className={styles.logo_section}>
					<Link to="/" className={styles.logo_container} style={{ textDecoration: "none" }}>
						<div className={styles.logo_box}>
							<Package className="w-11 h-11 text-white" strokeWidth={2} />
						</div>
						<span className={styles.logo_title}>ostrom</span>
					</Link>
					<h1 style={{ fontSize: "40px", fontWeight: "bold", color: "var(--brand-dark)", marginBottom: 12 }}>
						System Status
					</h1>
					<p className={styles.logo_subtitle}>
						Real-time status of Ostrom services
					</p>
				</div>

				{/* Card */}
				<div className={styles.login_form} style={{ minHeight: "unset" }}>

					{/* Banner */}
					{loading ? (
						<div style={{
							background: "#f5f5f5",
							borderRadius: "var(--radius-sm)",
							padding: "14px 18px",
							display: "flex",
							alignItems: "center",
							gap: 10,
							marginBottom: 24,
						}}>
							<span style={{
								display: "inline-block",
								width: 8,
								height: 8,
								borderRadius: "50%",
								background: "#d1d5db",
								animation: "pulse 1.5s ease-in-out infinite",
							}} />
							<span style={{ color: "#9ca3af", fontSize: "var(--text-sm)" }}>Checking services…</span>
						</div>
					) : bannerStatus && (
						<Banner status={bannerStatus} />
					)}
					{/* Services list */}
					<div>
						<span style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--brand-dark)",
							opacity: 0.4,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
						}}>
							Services
						</span>
						{(["auth", "orga", "storage"] as const).map((name) => (
							<ServiceRow
								key={name}
								name={name}
								status={health?.services[name]}
								aggregatorUp={aggregatorUp}
							/>
						))}
					</div>
					{/* Last updated */}
					<div style={{
						marginTop: 16,
						display: "flex",
						justifyContent: "space-between",
						fontSize: 12,
						color: "var(--brand-dark)",
						opacity: 0.4,
					}}>
						<span>{lastUpdated ? `Updated at ${lastUpdated.toLocaleTimeString()}` : "Fetching…"}</span>
						<span>Refreshes every 60s</span>
					</div>
				</div>
				<div className={styles.back_home_container}>
					<Link to="/" className={styles.back_home_link}>
						← Back to Home
					</Link>
				</div>
			</div>

			<style>{`
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.4; }
				}
			`}</style>
		</div>
	);
}
