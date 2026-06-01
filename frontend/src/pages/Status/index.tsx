import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Banner } from "./Banner";
import { ServiceRow } from "./ServiceRow";
import { StatusDot } from "./StatusDot";
import type { HealthResponse, ServiceState } from "../../types/health";
import authStyles from "../../styles/auth.module.css";
import styles from "../../styles/status.module.css";

// made this constant 57 since it can take up to 3 seconds to fetch from the backend so we have a round 60s update in worst case
const POLL_INTERVAL_MS = 57_000;

export default function StatusPage() {

	const [health, setHealth]           = useState<HealthResponse | null>(null);
	const [loading, setLoading]         = useState(true);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [aggregatorUp, setAggregatorUp] = useState<boolean | null>(null);

	const fetchHealth = async () => {
		try {
			const res  = await fetch("/api/health");
			const data = await res.json() as HealthResponse;
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
		const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []);

	const bannerStatus: ServiceState | null = loading
		? null
		: aggregatorUp === false
			? "unknown"
			: health?.status ?? null;

	return (
		<div
			className={authStyles.login_page_wrapper}
			style={{ background: "linear-gradient(to bottom right, #fef9f7, white)", alignItems: "flex-start", paddingTop: 64, display: "flex", flex: 1, minHeight: 0 }}
		>
			<div className={authStyles.login_page_container} style={{ maxWidth: 520 }}> {/* made it a bit larger than the container in the login page*/}

				{/* Logo */}
				<div className={authStyles.logo_section}>
					<Link to="/" className={authStyles.logo_container} style={{ textDecoration: "none" }}>
						<img src="/logo.png" alt="Ostrom logo" width={80} height={80} />
						<span className={authStyles.logo_title}>ostrom</span>
					</Link>
					<h1 className={styles.h1}>System Status</h1>
					<p className={authStyles.logo_subtitle}>Real-time status of Ostrom services</p>
				</div>

				{/* Card */}
				<div className={authStyles.login_form} style={{ minHeight: "unset" }}>

					{/* Banner */}
					{loading ? (
						<div className={styles.banner_loading}>
							<StatusDot state="unknown" pulse />
							<span className={styles.banner_loading_text}>Checking services…</span>
						</div>
					) : bannerStatus && (
						<Banner status={bannerStatus} />
					)}

					{/* Services list */}
					<div>
						<span className={styles.services_label}>Services</span>
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
					<div className={styles.footer}>
						<span>{lastUpdated ? `Updated at ${lastUpdated.toLocaleTimeString()}` : "Fetching…"}</span>
						<span>Refreshes every 60s</span>
					</div>
				</div>

				<div className={authStyles.back_home_container}>
					<Link to="/" className={authStyles.back_home_link}>
						← Back to Home
					</Link>
				</div>
			</div>
		</div>
	);
}
