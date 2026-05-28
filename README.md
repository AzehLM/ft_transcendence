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

The entire stack runs in Docker containers — no local Go, Node, or database toolchain is required.

## Configuration

The project relies on a `.env` file and a set of Docker secrets for credentials stored under `secrets/`. You can generate these secrets randomly with:

```bash
make setup
```

This will:
- Create a `.env` from `.env.example` (if it doesn't already exist)
- Generate the auto-generatable secrets (DB credentials, MinIO credentials, etc.) with random values

> ⚠️ **All secrets must exists** even if empty. Docker compose references ever secret at startup, so a missing file will cause the stack to fail - in **both dev and prod mode**.

A few secrets cannot be generated, as they depend on external services. `make setup` creates them as empty files; fill them manually if you need the following features:
- `cloudflare_tunnel_token` - Cloudflare tunnel if you want the application deployed on your own domain name.
- `discord_webhook_url` - for Alertmanager alerting features.

**Expected folder structure**

```bash
tree
```
 ⚠️ a modifier plus tard pour mettre le vrai tree partant du root et ne montrant que le .env et .env.example + secrets/ et les sous-dossiers


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

Responsible for overseeing technical decisions and the overall architecture. Researched and selected the technologies and tools needed to complete the team's chosen stack (e.g. MinIO was selected once Go was settled as the backend language). All architectural decisions — whether made individually, collectively, or per-task — are documented in the [tech-lead.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/tech-lead.md) file

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
| **Frontend** | React 18 + TypeScript 5.x | UI, client-side encryption, file management |
| **Styling** | Custom CSS styling + Tailwind CSS | Utility-first CSS framework |
| **Backend** | Go + Fiber | REST API, WebSocket broker, business logic |
| **ORM** | GORM | Type-safe database access |
| **Database** | PostgreSQL | Metadata, users, file hierarchy |
| **Object Storage** | MinIO (S3-compatible) | Encrypted file blob storage |
| **Monitoring** | Prometheus + Grafana | Metrics collection, dashboards, alerting |
| **2FA** | TOTP (pquerna/otp) | Two-factor authentication via Google Authenticator |
| **Containerization** | Docker + Docker Compose | Single-command deployment |

For more details on technical choices, again refer to [tech-lead.md](https://github.com/AzehLM/ft_transcendence/blob/main/docs/tech-lead.md).

- Frontend techno and frameworks used
- Backend techno and frameworks used
- Database system and why it was chosen
- Any other significan technologies or libraries
- Justitication for major technical choices

# Database Schema

- Visual representation or description of the DB structure
- Tables/collections and their relationships
- Key fields and data types

# Features List

- Complet list of implemented features
- Which team member(s) worked on each features
- Brief descritioon of each feature's functionality

# Modules

## Modules

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
