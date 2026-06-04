export interface ServiceStatus {
	liveness: boolean;
	readiness: boolean;
	degraded: boolean;
}

export interface HealthResponse {
	status: "ok" | "degraded" | "error";
	services: {
		auth: ServiceStatus;
		orga: ServiceStatus;
		storage: ServiceStatus;
	};
}

export type ServiceState = "ok" | "degraded" | "error" | "unknown";
