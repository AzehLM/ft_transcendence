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

The entire stack runs in Docker containers - no local Go, Node, or database toolchain is required.

## Configuration

The project relies on a `.env` file and a set of Docker secrets for credentials stored under `secrets/`. You can generate these secrets randomly with:

```bash
make setup
```

This will:
- Create a `.env` from `.env.example` (if it doesn't already exist)
- Generate the auto-generatable secrets (DB credentials, MinIO credentials, etc.) with random values

> ⚠️ **All secrets must exists** even if empty. Docker compose references every secret at startup, so a missing file will cause the stack to fail - in **both dev and prod mode**.

A few secrets cannot be generated, as they depend on external services. `make setup` creates them as empty files; fill them manually if you need the following features:
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
  - clarifying documentation and library usage (Fiber, GORM, MinIO presigned URLs, Prometheus);
  - ...
- ...

# Team information

### Chacun fais sa partie ici (j'ai repris l'ordre des roles du sujet)
- Pierrick Product Owner (PO) + dev
- Lou-Anne Project Manager (PM) / Scrum Master + dev
- Victoire Project Manager (PM) / Scrum Master + dev
- Guillaume Technical Lead / Architect + dev

### gueberso (Guillaume) - Technical Lead / Architect: Overseeing technivcal decisions and architecture + Developer

Responsible for overseeing technical decisions and the overall architecture. Researched and selected the technologies and tools needed to complete the team's chosen stack (e.g. MinIO was selected once Go was settled as the backend language). All architectural decisions - whether made individually, collectively, or per-task - are documented in the [tech-lead.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/tech-lead.md) file

As a developer, owns the storage microservice (client-side encrypted file storage, multipart uploads, quota management), the DevOps/infrastructure (Docker Compose, Caddy, Cloudflare Tunnel, observability stack), and the CI/CD pipeline (Postman E2E/RBAC test collections and backend linting via GitHub Actions).

---

# TEMP

Before starting Ostrom, each member proposed project ideas and a preferred backend/frontend stack; the core stack was decided collectively from there. We worked through GitHub Pull Requests, so every member participated in reviewing code changes.

---

For each member we need:
  - Assigned roles + brief description of their responsibilities

# Project Management


- How the team organized the work (task distribution, meetings, etc)
- Tools used for the project management (Github Issues, Github Project, Notion, Discord bots)
- Communication channels (Discord)

> Victoire / Lou-Anne, je vous laisserai faire cette partie

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

**Cloudflare Tunnel + Caddy** - allows exposing the platform publicly without a VPS or open inbound ports; the tunnel always routes to Caddy on a single local port, which keeps dev and prod networking identical.

**Client-side encryption** (Web Crypto API) - AES-GCM 256-bit with PBKDF2 key derivation, performed entirely in the browser, enforcing the zero-knowledge guarantee that the server never sees plaintext.

For the full per-decision tradeoffs, see [tech-lead.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/tech-lead.md).

# Database Schema

> je vous laisse faire ca


prérequis sujet:

- Visual representation or description of the DB structure
- Tables/collections and their relationships
- Key fields and data types

# Features List

The following is a complete inventory of implemented features, grouped by domain. Each feature lists the members who worked for its implementation

### Authentification system & Account

- **Zero-knowledge registration** - vicperri & pnaessen - RSA keypair generated on client-side with private key encryption **A REVOIR CA JE SAIS PAS TROP QUOI METTRE ICI**. The server only sees the public key and ciphertext.
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
- **Org-scoped storage** - lbuisson for orga & gueberso for storage integration - files and folders can belong to an organization; the RBAC checker resolves permissions based on membership.
- **Org settings** - rename, delete, retrieve public key for member onboarding.



- Complet list of implemented features
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
