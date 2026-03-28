# Technical Lead / Architect:

Oversees technical decisions and architecture.
- Defines technical architecture.
- Makes technology stack decisions.
- Ensures code quality and best practices.
- Reviews critical code changes.

---

### Tech lead / architect personal readme to track done work related to the role

---

#### Architecture choices:

- technologies choisies
- descriptif + comparatif entre techno vues/choisies/eliminées
- ci/cd intégré
- outils 'quality check' vu/utilisé/intégré

## Technical architecture choice

### Builder

- Building the project via a **Makefile** as it fits quite well our needs:
  - **Universally available** on Linux without any installation
    - No need external dependency compared to `just` or `task`
  - **Single entry point** for contributors
    - `make dev`, `make up` are enough to launch fully fonctionnal builds
  - **Microservices by design**
    - the `SERVICES` is auto-declared via `docker compose config --services`, so adding new services to the compose file also exposes them to the Makefile with no changes required
  - **Launching scripts** and/or shell commands to set up the environment
    - Technology version updating, downloading and installing dependencies, etc...
  - **Modularity** with differents sets of variable and rules
    - Development mode is straight forward to be used as dependencies can be declared in variables which makes isolation easy to read
  - **CI/CD integration**
    - GitHub Actions workflows stays minimal and readable by delegating to Makefile targets. The logic is defined once and is versioned with the code.


### Edge Gateway

> Not 100% defined but I'm committing a first choice

- Chose **Caddy** as main edge gateway or reverse proxy/load balancer for its features and as reference of our backend Go choice. Caddy has also a large amount of community built **plugins** that we might want to use. Here are some features we'll use Caddy for:
  - **Traffic routing** - takes requests and forwards them to our dockerized services
  - **Load balancing** - distributes traffic across multiple service instances
  - **Automatic TLS termination** - automatic HTTPS certificates (via Let's Encrypt) with HTTP to HTTPS redirects and no manual certificates renewals
  - **Security Headers** - CSP (Content Security Policy), HSTS (HTTP Strict Transport Security) and external plugins for XSS mitigation
  - **Single Entrypoint** - is the solely entrypoint of communication with our webapp, everything goes throught Caddy first, it acts as the public front door
  - **Monitoring Integration** - Native Prometheus metrics endpoint (via the `/metrics` route)


### Monitoring Stack

> We want high observability over the whole application with globaly industrial standards. Serves as both **production monitoring/alerting** and **development debugging tool** (local metrics/dashboards)

- **Prometheus + Grafana** are open-source and the core of the monitoring stack. Prometheus is a systems monitoring and alerting toolkit and Grafana is an analytic and interactive data-visualization platform. Linked to these services, we will also use:
  - **Caddy** internal **HTTP/service** metrics via Caddy `/metrics` endpoint (exposing requests, latency, 5xx errors, active connections, rate limits, etc.).
  - Business metrics will be exposed by **PostgreSQL data source** + **MinIO Prometheus exporter** for storage usage. The objective here is to create Heatmaps per user/org/group and have quota alerts

> ⚠️ **THE FOLLOWING ARE NOT DEFINED YET**

- Prometheus AlertManager exposing important metrics via defined extra service ? (sending discord/slack/email ?)
- Grafana dashboards would be either imported from Community plateform or handmade depending on the needs.
- CI/CD integration: depending on the workload I'll implement `make dev`/`make test` auto‑includes monitoring for local validation

### Database (Postgres)

- Chose **PostgreSQL 18 (on an alpine container)** as the sole relational database, shared across backend microservices that needs it. The following are reasons we believe Postgres is the right choice:
  - **UUID primary keys** - native generation of UUID keys via `gen_random_uuid()` from the `pgcrypto` extension (built-in alpine container).
  - **Encryption-aware** - columns storing cryptographic material use native `BYTEA` type;no encoding, no ORM abstraction leakage (`public_key`, `salt`, `encrypted_private_key`, etc.)
  - **Quota enforcement** - `used_space` / `max_space` fields on `users` and `organizations` can enforce default space limits and be tracked by the file service on upload and deletion
  - **Referential integrity** - rules like `ON DELETE CASCADE` / `ON DELETE RESTRICT` define ownership of folders and files at the database level
  - **Credentials via docker secrets** - `POSTGRES_USER_FILE`, `POSTGRES_PASSWORD_FILE`,`POSTGRES_DB_FILE` can be passed as `secrets` so we never have plaintext of critical environment variables
  - **Query** - GORM or SQLC SQL are is easily interpreted queries by Postgres.

### File storage (MinIO)

- Chose **MinIO** (via a maintained chainguard docker image) as the S3-compatible object store for users and organization uploaded files
  - **S3-compatible API** - MinIO is self-hosted implementation of the S3 HTTP protocol, we don't need an AWS account or cloud dependency for the backend to interact with our object store
  - **Separation** - MinIO stores raw encrypted bytes, identified by a UUID (`minio_object_key` in the Postgres db). All metadata are exclusive to Postgres, neither of the services are aware of the other; the backend is the bridge between them.
  - **Network isolation** - the `9000` port is never exposed on the host; backend services reach MinIO from the internal `docker network`. The `127.0.0.1:9001` port will remain exposed in dev mode for debug purposes but won't in production.
  - **Monitoring Integration** - a Prometheus-compatible `/minio/health` endpoint and metrics that can be scraped by our monitoring stack (Prometheus/Grafana).

### ⚠️ Security tradeoff: client-side encryption vs server-side file scanning

The core security guarantee of our project is that **uploaded files are never in plaintext within our infrastructure**. Encryption is performed client-side in the browser before transmission; the backend receives and stores **ciphertext**.

This guarantee is fundamentally incompatible with server-side antivirus scanning:
- **ClamAV** (or any server-side scanner) requires plaintext bytes to match against signatures. Since the backend only sees ciphertext, scanning at the backend level is architecturally impossible without decryption or upload files in plaintext somewhere on the infrastructure - which would break our guarantee.
- **VirusTotal API** calls from the frontend would require sending the plaintext file to a third-party server before encryption. These kind of services explicitly state that files uploaded via their free API may be shared with security vendors - which directly violates our confidentiality model.
- **Isolated environments** (ephemeral containers, VMs) do not resolve the problem - the threat model is not about internet expose but about plaintext files existing on the infrastructure we operate. An isolated container still constitutes our infrastructure and does not provide a proof to users that a plaintext copy was destroyed after scanning.

**Decision**: server-side malware scanning is intentionally absent. This is a conscious architectural tradeoff, not an oversight.

**What is enforced client-side** as a lightweight mitigation:
- **MIME** type and file extension validation before encryption - ⚠️ a voir ensemble
- **File size limits** enforced before upload - ⚠️ a voir ensemble

These are acknowledged as bypassable by a motivated attacker, and are not presented as security guarantees - only as friction against accidental misuse.

> ⚠️ Dans l'idée cette partie pourrait etre déplacer dans nos pages *Privacy Policy* et *Terms of Service*

### ORM (GORM)

- Chose **GORM** over **SQLC** for its developer ergonomics and how well it fits our CRUD‑oriented backend services. SQLC was our second choice because it offers strong compile‑time type safety, but it is a SQL‑to‑Go code generator, not a full ORM. Our service is more convention‑driven and benefits from a higher‑level abstraction that GORM provides via:

  - **Auto‑migration** via `AutoMigrate()` on our models, which keeps our schema in sync with Go structs during development.
  - **Struct‑based modeling** aligned with our domain (users, organizations, folders, files), reusing the same structs as DTOs (Data Transfer Object) across services.
  - **Native associations** Can express ownership and relationships without manual joins (via `HasOne`, `BelongsTo`, etc...).
  - **Hooks / callbacks** (`BeforeCreate`, `AfterUpdate`, etc.) that allow transparent enforcement of business logic such as quota checks, UUID generation, and timestamps directly at the ORM layer.
  - **Transaction support** (`db.Transaction(...)`) so multi‑step operations (e.g. file upload + quota update) remain atomic.

> ⚠️ **NOTE**: GORM’s `AutoMigrate()` is restricted to **development only**. In production, we will use a dedicated migration tool (e.g. `golang‑migrate`) to ensure reversible schema changes.

### Design Systen

> Custom design system built with Material-UI (MUI) to ensure consistent UI.

- **MUI** is a React component library
