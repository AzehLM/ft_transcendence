*This project has been created as part of the 42 curriculum by lbuisson, vicperri, pnaessen, gueberso.*

# Description

### Ostrom

**Ostrom** is a zero-knowledge, end-to-end encrypted cloud storage platform. Users can store files in a personal space or collaborate within shared organizational spaces, with role-based access control.

The project is named after economist Elinor Ostrom, the first woman to receive the Nobel Memorial Prize in Economic Sciences, awarded for her analysis of economic governance - particularly the governance of shared common resources. The name reflects the platform's core: enabling individuals and groups to manage shared resources securely and collaboratively.

Its defining principle is that the server never sees plaintext. All files are encrypted client-side before upload, so neither the infrastructure nor its operators can read user data. This zero-knowledge design is the project's primary differentiator.

# Instructions

## Prerequisites

- **Docker engine** >= 24.0
- **Docker compose** v2
- **GNU Make**

> [!NOTE]
> The entire stack runs in Docker containers - **no local Go, Node, or database toolchain is required.**

## Configuration

The project relies on a `.env` file and a set of Docker secrets for credentials stored under `secrets/`. You can generate these secrets randomly with:

```bash
make setup
```

This will:
- Create a `.env` from `.env.example` (if it doesn't already exist)
- Generate the auto-generatable secrets (DB credentials, MinIO credentials, etc.) with random values

> [!WARNING]
> **All secrets must exists** even if empty. Docker compose references every secret at startup, so a missing file will cause the stack to fail - in **both dev and prod mode**.

A few secrets cannot be generated, as they depend on external services. `make setup` creates them as empty files. Fill them manually if you need the following features:
- `cloudflare_tunnel_token` - Cloudflare tunnel if you want the application deployed on your own domain name.
- `discord_webhook_url` - for Alertmanager alerting features.

**Expected folder structure**

```
.
├── Makefile
├── README.md
├── .env
├── .env.example
├── secrets/
│   ├── grafana/
│   │   ├── grafana_admin_pwd.txt
│   │   └── grafana_admin_user.txt
│   ├── minio/
│   │   ├── minio_admin_pwd.txt
│   │   ├── minio_admin_user.txt
│   ├── postgres/
│   │   ├── postgres_db.txt
│   │   ├── postgres_pwd.txt
│   │   └── postgres_user.txt
│   ├── redis/
│   │   ├── redis_pwd.txt
│   ├── ssl/
│   │   ├── .hostname
│   │   ├── cert.pem
│   │   └── key.pem
│   ├── cloudflare_tunnel_token
│   ├── discord_webhook_url
│   └── jwt_secret
└── ...
```
> The SSL certificate will be generated at the first build and placed in the secrets directory automatically.

## Running the project
Two available modes:

| Mode | Command | Notes |
|:----:|:----:|:----|
| Development | `make dev`| Includes Adminer (DB UI), relaxed infrastructure constraints, served at http://localhost:{PORT} |
| Production | `make prod`| Hardened setup, adminer, minio, prometheus services not accessible unless locally |

To stop and/or cleanup
```sh
make down			# down every containers
make db-reset		# reset postgres database
make minio-reset	# delete every minio objects
make fclean			# deletes every container/images/volumes
```

# Resources

### Documentation references

- [Go](https://go.dev/doc/)
- [Fiber v3](https://docs.gofiber.io/)
- [MinIO](https://docs.min.io/aistor/)
- [Redis](https://redis.io/docs/latest/develop/clients/go/)
- [Postgres 18](https://www.postgresql.org/docs/18/index.html)
- [GORM](https://gorm.io/docs/index.html)
- ...

### Inspiration

- [Google Drive](https://drive.google.com/drive/home)
- [Mega](https://mega.io/)
- [Proton](https://proton.me/fr) - zero-knowledge encrypted storage (closest reference for our security model)

### AI usage

AI tools were used as assistants for review, debugging, and design exploration. Core architecture and implementation decisions were made by the team.

- Use of Github Copilot on our Pull Requests to have a deeper review and/or problems identifications
- [Stitch](https://stitch.withgoogle.com/) and [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs) for early UI/UX mockups and design exploration for the frontend
- Claude / Perplexity / Gemini / ChatGPT for:
  - debugging and identifying bugs or performance improvement (e.g. quota race conditions (and avoid TOCTOU), RBAC edge cases)
  - clarifying documentation and library usage (Fiber, GORM, MinIO presigned URLs, Prometheus)
  - ...
- ...

# Team information

### Chacun fais sa partie ici (j'ai repris l'ordre des roles du sujet)
- Pierrick Product Owner (PO) + dev
- Lou-Anne Project Manager (PM) / Scrum Master + dev
- Victoire Project Manager (PM) / Scrum Master + dev
- Guillaume Technical Lead / Architect + dev

### vicperri (Victoire) - Project Manager  / Scrum Master :  Facilitates team coordination and removes obstacles + Developer

Alongside lbuisson, was responsible for project management and Scrum Master duties, which included organizing team meetings and planning sessions, tracking progress and deadlines, ensuring smooth team communication, and managing risks and blockers throughout the project.

As a developer, implemented two-factor authentication (2FA), the encryption functions for the registration and login process, designed the mockups of the website, built the core structure of the frontend, added profile picture support for users on both the backend and frontend, and ensured overall UI/UX quality throughout the project.


### gueberso (Guillaume) - Technical Lead / Architect: Overseeing technivcal decisions and architecture + Developer

Responsible for overseeing technical decisions and the overall architecture. Researched and selected the technologies and tools needed to complete the team's chosen stack (e.g. MinIO was selected once Go was settled as the backend language). All architectural decisions - whether made individually, collectively, or per-task - are documented in the [tech-lead.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/tech-lead.md) file

As a developer, owns the storage microservice (client-side encrypted file storage, multipart uploads, quota management), the DevOps/infrastructure (Docker Compose, Caddy, Cloudflare Tunnel, observability stack), and the CI/CD pipeline (Postman E2E/RBAC test collections and backend linting via GitHub Actions).


---

For each member we need:
  - Assigned roles + brief description of their responsibilities

# Project Management


The team followed an agile-inspired workflow managed by the two Scrum Masters (lbuisson and vicperri). At the start of the project, tasks were distributed among members based on each person's assigned role and area of ownership. From there, the team held weekly meetings to review progress, discuss blockers, and plan the upcoming week. Notes from each meeting were recorded in a shared Notion file, which also served as the central to-do tracker, updated every week to reflect what had been done, what was in progress, and what remained.

Task tracking and development workflow were handled through GitHub Issues and GitHub Projects, allowing the team to link work directly to the codebase and keep a clear history of decisions. Notion complemented this by serving as a space for meeting notes. Discord was the team's main communication channel, used for day-to-day exchanges, quick syncs, and automated notifications via bots (build alerts, PR activity, etc.).

# Technical Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React + TypeScript 5.x | UI, client-side encryption, file management |
| **Styling** | Custom CSS styling + Tailwind CSS v4 | Styling Utility-first + scoped component styles |
| **Backend** | Go + Fiber v3 | REST API, WebSocket broker, business logic |
| **ORM** | GORM | Type-safe database access |
| **Database** | PostgreSQL | Metadata, users, file hierarchy |
| **Object Storage** | MinIO (S3-compatible) | Encrypted file blob storage |
| **Cache / Messaging** | Redis | Caching, pub/sub |
| **Reverse Proxy** | Caddy | TLS termination, routing |
| **Networking** | Cloudflare Tunnel | Public acces without a VPS |
| **Authenticating** | JWT (cookie-bases) | Session authentification |
| **2FA** | TOTP | Two-factor authentication |
| **Monitoring** | Prometheus + Grafana + Alertmanager| Metrics, dashboards, alerting |
| **Containerization** | Docker + Docker Compose | Single-command deployment |

**Go + Fiber** - Go was chosen for its strong concurrency model and performance, well suited to a microservice architecture (auth, storage, orga). Fiber v3 provides a lightweight, Express-like routing layer on top.

**PostgreSQL** - chosen over alternatives for its reliability, strong support for relational data (user/file/organization hierarchies, RBAC relationships), and transactional guarantees.

**MinIO** - provides S3-compatible object storage that can be self-hosted, avoiding any third-party cloud provider. It stores only client-side encrypted blobs and issues presigned URLs so file data never transits through the API server.

**Cloudflare Tunnel + Caddy** - allows exposing the platform publicly without a VPS or open inbound ports. The tunnel always routes to Caddy on a single local port, which keeps dev and prod networking identical.

**Client-side encryption** (Web Crypto API) - AES-GCM 256-bit with PBKDF2 key derivation, performed entirely in the browser, enforcing the zero-knowledge guarantee that the server never sees plaintext.

> [!TIP]
> For the full per-decision tradeoffs, see [tech-lead.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/tech-lead.md).

# Database Schema

> [!NOTE]
> **je vous laisse faire ca**


prérequis sujet:

- Visual representation or description of the DB structure
- Tables/collections and their relationships
- Key fields and data types

# Features List

The following is a complete inventory of implemented features, grouped by domain. Each feature lists the members who worked for its implementation

### Authentification system & Account

- **Zero-knowledge registration** - vicperri & pnaessen - An RSA keypair is generated entirely on the client side. The private key is encrypted using a key derived from the user's password and a client-generated salt, and an authentication hash is separately derived from the password for server-side verification. The server receives and stores only the public key, the encrypted private key, and the Argon2id-rehashed auth hash. The plaintext password and plaintext private key never leave the client.
- **Login with Argon2id verfication** - pnaessen + vicperri ? - the client-derived auth hash is re-hashed with Argon2id server-side before comparison. The encrypted private key is then returned to the client.
- **Client salt retrieval with user-enumeration protection** - pnaessen - the `/api/auth/salt` returns a fake salt for non-existent users so attackers cannot probe for valid emails.
- **Refresh-token rotation** - **PIERRICK + QUI ?** - refresh tokens stored hashed in DB, set as HttpOnly cookies with 15min access token lifespan.
- **Account management** - **LIRE LA SUITE POUR METTRE NOM** - first/family name changes, password changes (with private-key re-encryption), account deletion, profile view
- **Avatar Upload** - vicperri - stored directly in PostgreSQL as `BYTEA` (no MinIO dependency for avatars)
- **Rate-limited login** - pnaessen - Fiber limiter **(mettre values)**

### Two-Factor Authentication (fully done by vicperri)

- **TOTP setup with QR code** - pquerna/otp-generated secrets (Go library), displayed as QR code on the frontend (qrcode.react), with a 5-minute setup window.
- **TOTP-secret encryption** - the secret is encrypted with a key derived from client salt and the user id before being stored.
- **Recovery codes** - bcrypt-hashed, single-use, base64-encoded JSON in DB. The user sees them once at 2FA activation.
- **Lockout policy** - 3 wrong attempts -> 5-minute lockout. Window resets after 5 minutes of inactivity.
- **Temp-token 2FA challenge** - between password verification and TOTP/recovery-code submission, a scoped 5-minute JWT (scope: "2fa") gates the second step.
- **2FA disable flow** - requires password re-verification.

### Storage & File Management

- **Client-side file encryption** - **METTRE NOMS** - every files is encrypted in the browser with AES-GCM 256-bit, using a per-file DEK, which is itself RSA-encrypted with the owner's (or org's) public key.
- **Single-PUT upload** - gueberso - files under 96MB are encrypted in a single chunk and PUT directly to MinIO via a presigned URL
- **Multipart upload** - gueberso - files above 96MB are split into 32MB plaintext chunks (up to 100 parts, hard cap at 2GB), with parallel PUT (concurrency by 4 chunks) and a deterministic per-chunk IV derived from the base IV + chunk number. Initialisation / finalization and abortion endpoints handle the MinIO multipart lifecycle.
- **Encrypted download** - **pierrick ou victoire pour les hooks du front ? & gueberso (backend)** - presigned download URL returned alongside the encrypted DEK and IV. Decryption, again, happens in the users browser.
- **Folder hierarchy** - gueberso - create, rename, move, delete folders. Cyclic detection to prevent moving folder into one of its descendants
- **File operations** - gueberso **& lbuisson ?**- move between folders, delete (with cascade to MinIO via Redis stream events).
- **Quota enforcement** - gueberso **& d'autres ?** - per-user and per-org quotas (5GB default), atomic queries to avoid TOCTOU races, rollback if the upload fails after the increment.
- **MIME-type validation** - pnaessen (frontend) & gueberso (backend) - magic-number detection via file type before encryption, extension check and rejection of unrecognized types

### Organization (fully done by lbuisson)

- **Org creation with shared cryptography** - each org has its own RSA keypair. The org's private key is wrapped with a per-member AES key, itself RSA-encrypted with each member's public key. New members get their own wrapped copy.
- **Roles (admin / member)** - admins manage members, settings, and quota. Members read and contribute. Enforced by a middleware.
- **Member management** - invite/add, change role, remove member, leave organization, set personal description in the org.
- **Org-scoped storage** - lbuisson for orga & gueberso for storage integration - files and folders can belong to an organization. The RBAC checker resolves permissions based on membership.
- **Org settings** - rename, delete, retrieve public key for member onboarding.

### Real-time & Notifications

- **WebSocket hub** - **pnaessen & ? QUI** - single /ws/notifications endpoint multiplexed per user. Per-user Redis pub/sub channels re-broadcast to connected clients.
- **Online presence tracking** - **lbuisson ?** - Redis sets track active sessions. Org members see who's online in real time.
- **Toast + dropdown notifications** - **QUI ? Je commence a avoir la flemme lol** - frontend `NotificationContext` manages connection lifecycle, reconnection backoff, listener registration, unread counts, and toast queue.
- **Cross-service event propagation** - gueberso - Redis Streams with consumer groups guarantee delivery of cleanup events between auth, orga, and storage.

### Design System & UI

- **Reusable component library** - vicperri & lbuisson - 30+ components under frontend/src/components/: Button, Input, FileCard, FolderCard, FileGrid, Breadcrumb, ConfirmationModal, MoveModal, StorageBar, Sidebar, etc.
- **Tailwind v4 + CSS Modules** - vicperri & lbuisson - utility-first base with scoped module styles per page (auth.module.css, dashboard.module.css, profile.module.css, etc.).
- **Self-hosted IBM Plex Sans** - gueberso - loaded via @font-face (no Google Fonts dependency, helps CSP compliance).
- **Theming & animations** - vicperri & lbuisson - theme.css design tokens. Framer-motion for transitions.
- **Icon system** - vicperri - lucide-react, consistent specification.
- **Static pages** - pnaessen & gueberso - Home, About, Privacy Policy, Terms of Service, 404.

### DevOps & Infrastructure (fully done by gueberso)

- **Docker Compose orchestration** - two modes (dev/up), 12 (**a verifier ca fait longtemps j'ai pas lancer**) services in prod, dev mode adds Adminer, exposes additional ports.
- **Caddy reverse proxy** - TLS termination, security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy), MinIO `Host`-header rewrite for presigned URLs, routing for all microservices and Grafana sub-path.
- **Cloudflare Tunnel** - public exposure without a VPS or open inbound ports. Same internal port in dev and prod.
- **Docker secrets** - every credential (Postgres, MinIO, Redis, Grafana, JWT, Cloudflare token, Discord webhook) is read from `/run/secrets/`, never from environment variables in plaintext.
- **Prometheus + Grafana** - Caddy metrics, MinIO metrics, custom `ostrom_user_used_space_bytes` collector, pre-provisioned dashboards.
- **Alertmanager + Discord webhook** - alerts routed to a Discord channel.
- **Status page** - dedicated `health-aggregator` microservice + `/status` page on the frontend listing each service's state.
- **Automated backups** - `backup` container with `supercronic`, scheduled `pg_dump` (daily rotation 7 days / weekly 4 weeks) and `mc mirror` of the MinIO bucket. `make backup-restore` for recovery.
- **CI/CD** - GitHub Actions: golangci-lint matrix (one job per service: storage / auth / orga / shared) and a Postman collection run on every PR with the full stack spun up in dev mode.
- **Self-signed TLS cert generation** - Makefile generates a per-host SSL cert on first build for local development (whic is also used in prod).


---


- Complete list of implemented features
- Which team member(s) worked on each features
- Brief descritioon of each feature's functionality

# Modules

### Points Summary

| # | Module | Category | Type | Points |
|:---:|--------|:----------:|------|:--------:|
| 1 | Framework for both frontend an backend | Web | Major | 2 |
| 2 | Real-time features (WebSockets) | Web | Major | 2 |
| 3 | ORM for the database | Web | Minor | 1 |
| 4 | Complete notification system   | Web | Minor | 1 |
| 5 | Custom-made design system with reusable components | Web | Minor | 1 |
| 6 | File upload and management system | Web | Minor | 1 |
| 7 | Support for additional browsers | Accessibility | Minor | 1 |
| 8 | Standard user management & authentication | User Management | Major | 2 |
| 9 | Organization system | User Management | Major | 2 |
| 10 | Complete 2FA system for the users | User Management | Minor | 1 |
| 11 | Backend as Microservices | DevOps | Major | 2 |
| 12 | Monitoring (Prometheus + Grafana) | DevOps | Major | 2 |
| 13 | Health check and status page system with automated backups and disaster recovery procedures | DevOps | Minor | 1 |
| 14 | Client-Side Encryption (Zero-Knowledge) | Custom | Major | 2 |
| | | | **Total** | **21** |


### **Framework for both frontend and backend - *Major***

- **Why**: the project scope (microservice, websockets, etc.) required production-grade frameworks rather than improvised HTTP routing.
- **Implementation**: **Go + Fiber v3** for every backend microservices, native goroutine-based concurrency, low memory footprint. **React + Typescript** for the frontend for the typed componenets, declarative routing via `react-router-dom`
- **Owner(s)**: Every member of the group worked on both frontend/backend to their extend.

**Real-time features (Websockets) - *Major***

- **Why**: the plateform shows live notifications and online-presence indicators inside organizations  for a better user experience.
- **Implementation**: a single `/ws/notification` endpoint. A `Hub`, subscribing to wanted events. Redis pub/sub channels and re-broadcast.
- **Owner(s)**: pnaessen and gueberso

### **ORM for the database - *Minor***

- **Why**: Postgres is shared by our backend microservices. A typed ORM avoids hand-written SQL and aligns naturally with Go structs
- **Implementation**: **GORM** with struct-tag schema, native associations, transactions for atomic operations, hooks for UUID generation. Schema in done via an SQL init script that can be found under `01_init_schema_up.sql`
- **Owner(s)**: Setup done by lbuisson and pnaessen but every member of the group updated and used it throught the project construction

### **Complete notification system - *Minor***

- **Why**: Users need feedback on operations (uploads, org invites, role changes, etc.) and on activity from other members of their organizations
- **Implementation**: Redis pub/sub for fire-and-forget UI events + Redis streams for guaranteed-delivery events. The frontend manages a websocket that exposes a dropdown notification system with unread counts and surfaces events via toasts.
- **Owner(s)**: gueberso owns the Redis implementation, pnaessen the link to the websocket and frontend notification systems

### **Custom-made design system with reusable components - *Minor***

- **Why**: for consistent visuals accrois the app pages, reducing code duplication.
- **Implementation**: 30+ react components under `frontend/src/components`, each with its own CSS module. Usage of `lucide-react` for Icons and a self-hosted IBM Plex Sans.
- **Owner(s)**: vicperri and lbuisson

### **File upload and management system  - *Minor***

- **Why**: it is the core feature of the plateform. Must handle large files, partial failures without exposing plaintext to the server.
- **Implementation**: dual-mode upload (single-PUT or multipart depending on file size). Pre-encryption mime.types validation via magic-numbers. Per-chunk IV derivation for multipart, folder hierarchy with cyclic-move detection, quota enforcement + rollback/soft-delete + Redis-stream-driven MinIO cleanup.
- **Owner(s)**: gueberso for the backend and business logic, pnaessen/vicperri for the upload/download - encryption/decryption implementation in the frontend

### **Support for additional browsers - *Minor***

- **Why**: the project aim for large scale so this was a logic choice.
- **Implementation**: frontend relies only on standardized Web Crypto API primitives (PBKDF2, AES-GCM, RSA-OAEP, SHA-256) and standard `fetch` / Websocket APIs
- **Owner(s)**: vicperri, lbuisson, pnaessen

### **Standard user management & authentication - *Major***

- **Why**: required by the projects. The plateform handles sensitive data so authentification must be hardened
- **Implementation**: register / login / logout/ refresh / delete, Argon2id server-side hashing of the client derived auth hash. JWT refresh tokens with 15min access, per login limit-rate, avatar upload
- **Owner(s)**: pnaessen, vicperri, lbuisson

### **Organization system - *Major***

- **Why**: Ostrom collaborative dimension - users can share encrypted spaces with explicit role-based access
- **Implementation**: each org has its how RSA keypair, each member receives a per-member-wrapped copy of the org's private key. Admin / member roles enforced via a `RequireRole` middleware and a share `rbac` package used by the storage service for defence-in-depth. Endpoint cover creation / rename / delete / invite / removal / change-role for members, leave-org, per-member description.
- **Owner(s)**: lbuisson for the backend, business logic and frontend implementation, gueberso only for the RBAC implementation needed in the storage service

### **Complete 2FA - *Minor***

- **Why**: the plateform stores sensitive data, offering TOTP-based 2FA is a security upgrade with minimal UX friction
- **Implementation**: TOTP via `pquerna/otp` with QR-code provisioning. 5min setup window with in-memory pending-secret. TOTP secret encrypted at rest with a derived key from `client salt + user id`. 10 single-use recovery codes, lockout policy (3 attempts, 5min lockout), scoped temp-JWT. Enabling/disabling 2FA flow.
- **Owner(s)**: vicperri

### **Backend as Microservices  - *Major***

- **Why**: Clean ownership boundaries between team members. Each services deployable and testable in isolation. If a service is down the whole application can still be running and usable
- **Implementation**: several Go microservices in a `go.work` workspace. A complete independent monitoring stack. Caddy, Redis, Postgres and Adminer in dev mode in their owns Docker containers
- **Owner(s)**: gueberso

### **Monitoring (Prometheus + Grafana) - *Major***

- **Why**: observability is needed both as a production tool but mainly done for development debugging purposes
- **Implementation**: Prometheus scrapes services thats exposes endpoints or endpoints created depending on needs. Grafana serves these metrics throught provisioned datasources and dashboards. Alertmanager routes alerts to a Discord webhook.
- **Owner(s)**: gueberso

### **Health check, status page, backups & disaster recovery - *Minor***

- **Why**: Matches well the microservice architecture and allows the plateform to be transparent for users on services available. Ensures data can be recovered if Postgres or MinIO is wiped.
- **Implementation**: Go microservices exposes a `/health` endpoint, a dedicated **health-aggregator** microservices returns an aggregated status to the front on a `/status` page, showing per-service indicators. Backups are run via a `backup` container with `supercronic`. `pg_dump` is runned every night with a weekly retention. `mc mirror` for the MinIO `ostrom` bucket is also run every week. For details and instruction see [backup.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/backup.md)
- **Owner(s)**: gueberso

### **Client-Side Encryption (Zero-Knowledge) - *Major - custom***

- **Why**: this is Ostrom's defining principle and primary differenciator vs Google Drive or other shared cloud storage plateforms. Our server cannot read user data.
- **Implementation**: **FAITES VOUS PLAISIR J'AI MAL AU CRANE**
- **Owner(s)**:

---

- list of all chosen modules (major and minor)
- Point calculation
- **Justification for each module choice**
- How each module was implemented
- Which team member worked on each module

# Individual contribution

- Detailed breakdown of what each team member contributed
- Specific features, modules, or componenets implemented by each person
- Any challenges faced and how they were overcome

## Other informations such as:

- Known limitations, credits
