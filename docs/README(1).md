*This project has been created as part of the 42 curriculum by pnaessen vicperri lbuisson gueberso

# 🔒 ft_box

> Stockez vos fichiers sensibles en confiance. Même nos serveurs ne peuvent pas les lire.

**ft_box** is a high-performance, Zero-Knowledge cloud storage platform where files are encrypted client-side before ever leaving the browser. Built with Go, React, and MinIO, it ensures that even the server operators cannot access user data.

---

## 📋 Table of Contents

- [Description](#description)
- [Team Information](#team-information)
- [Technical Stack](#technical-stack)
- [Why This Stack?](#why-this-stack)
- [Architecture Overview](#architecture-overview)
- [What is an ORM?](#what-is-an-orm)
- [Database Schema](#database-schema)
- [Modules](#modules)
- [Features List](#features-list)
- [Individual Contributions](#individual-contributions)
- [Project Management](#project-management)
- [Instructions](#instructions)
- [Resources](#resources)

---

## Description

ft_box is a web-based file storage platform built around a **Zero-Knowledge Architecture**. Unlike traditional cloud services (Dropbox, Google Drive), ft_box encrypts all files directly in the user's browser using AES-GCM 256-bit encryption before any data is transmitted. The server only ever sees encrypted blobs — it has no way to read, inspect, or analyze user files.

**Key features:**
- Client-side encryption (AES-GCM 256) — your files, your keys, your privacy
- Microservices architecture: API Gateway, Auth Service, Storage Coordinator, WebSocket Broker
- Presigned URLs for direct client-to-storage transfers (the API never touches file bytes)
- Multi-tenant organization system with RBAC permissions and group-based access control
- Public REST API documented
- Infrastructure monitoring with Prometheus & Grafana

---

---

## Technical Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 18 + TypeScript 5.x | UI, client-side encryption, file management |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Backend** | Go + Fiber | REST API, WebSocket broker, business logic |
| **ORM** | GORM (or SQLC) | Type-safe database access, migrations |
| **Database** | PostgreSQL | Metadata, users, permissions, file hierarchy |
| **Object Storage** | MinIO (S3-compatible) | Encrypted file blob storage |
| **Monitoring** | Prometheus + Grafana | Metrics collection, dashboards, alerting |
| **2FA** | TOTP (pquerna/otp) | Two-factor authentication via Google Authenticator |
| **Containerization** | Docker + Docker Compose | Single-command deployment |

---

## Why This Stack?

### Go (Fiber) over Node.js — Backend

The choice of Go as our backend language is driven by three core requirements of ft_box:

**1. Concurrency model**
ft_box needs to handle thousands of simultaneous WebSocket connections (chat, notifications, sharing events) and parallel file upload authorizations. Go's goroutines are lightweight threads (~2KB of stack each) managed by the Go runtime scheduler. This means 50,000 concurrent WebSocket connections consume roughly 100MB of memory. Node.js, with its single-threaded event loop, would block on CPU-intensive operations (like hash computation for file integrity checks) and degrade latency for all connected users.

**2. Static typing & robustness**
Go catches entire classes of bugs at compile time — null pointer dereferences, type mismatches, unhandled errors. In a security-critical application that handles encryption metadata, permissions, and file integrity, runtime crashes are unacceptable. Go's explicit error handling (`if err != nil`) forces developers to think about every failure path.

**3. Deployment simplicity**
Go compiles to a single static binary with zero external dependencies. Our Docker image is built from `scratch` + one binary ≈ 70MB, compared to ~800MB for a typical Node.js image. This matters for a self-hosted product where users deploy on their own infrastructure.

### React + TypeScript — Frontend

TypeScript is not optional for ft_box. The frontend handles binary data streams (Web Crypto API, FileReader, ArrayBuffers), complex file tree structures, and encryption key management. Without static typing, a single wrong type passed to the Web Crypto API silently produces corrupted encrypted data — a catastrophic failure in a Zero-Knowledge system. TypeScript catches these errors before they reach production.

React 18's concurrent rendering allows us to efficiently render file trees with 5,000+ items without blocking the UI, which is critical for a file management application.

### PostgreSQL + MinIO — Storage Architecture

The key architectural decision in ft_box is the **strict separation between metadata and blobs**:

- **PostgreSQL** stores only structural data: folder hierarchy, user permissions (RBAC), file metadata (name, size, hash), sharing relationships. It guarantees ACID compliance and referential integrity.
- **MinIO** stores only encrypted binary objects. It's S3-compatible, horizontally scalable, and supports multi-node replication.

This decoupling means scaling storage (adding MinIO nodes/disks) has **zero impact** on the database. Going from 100GB to 1PB is a hardware operation, not an architecture change.

The **Presigned URL** mechanism is the critical performance enabler: when a user uploads a 5GB file, the API only handles a ~50ms authorization check and URL signing. The actual 5GB transfer goes directly from the client's browser to MinIO, bypassing the API entirely. This means the API's CPU and memory usage stays near zero regardless of file sizes, and it can handle thousands of parallel uploads.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│          Frontend (React + TypeScript)            │
│   [Web Crypto API: AES-GCM 256 encryption]       │
└─────────────────────────────────────────────────┘
                         ↓
          ┌──────────────────────────┐
          │   API Gateway (Go/Fiber) │
          │   Rate-limiting, routing │
          └──────────────────────────┘
           ↓          ↓            ↓
  ┌────────────┐ ┌──────────┐ ┌──────────────┐
  │   Auth     │ │ Storage  │ │  WebSocket   │
  │  Service   │ │Coordinat.│ │   Broker     │
  │ (JWT/2FA)  │ │ (MinIO)  │ │  │
  └────────────┘ └──────────┘ └──────────────┘
        ↓              ↓              ↓
  ┌──────────────────┐  ┌──────────────────┐
  │   PostgreSQL      │  │   MinIO Cluster   │
  │   (Metadata)      │  │   (Blob Storage)  │
  └──────────────────┘  └──────────────────┘
                                  ↑
                     Direct upload/download
                     via Presigned URLs
                     (API is OFF during transfer)
```

**Upload workflow:**
1. Client requests upload authorization → API validates permissions & quota (~50ms)
2. API generates a temporary signed URL (expires in 24h)
3. Client encrypts file in-browser (AES-GCM 256) and uploads directly to MinIO
4. MinIO notifies API on completion → API updates PostgreSQL metadata

**Zero-Knowledge guarantee:** The encryption key is derived from the user's master password via PBKDF2 (100k iterations) and **never leaves the client**. The server only stores encrypted blobs and cannot decrypt them.

---

## What is an ORM?

An **ORM** (Object-Relational Mapping) is an abstraction layer between application code and the database. Instead of writing raw SQL queries, developers interact with the database through the programming language's native data structures.

In the context of ft_box (Go + PostgreSQL), the ORM allows us to:

**Without ORM (raw SQL):**
```go
rows, err := db.Query("SELECT id, name, email FROM users WHERE id = $1", userId)
// Manual scanning, type conversion, error-prone
```

**With ORM (GORM):**
```go
var user User
db.First(&user, userId)
// Automatic mapping to Go struct, type-safe, SQL injection protected
```

**Why we use an ORM in ft_box:**
- **Migrations:** Schema changes are versioned and reproducible across environments (dev, staging, production). Adding a column to the `files` table is a Go migration file, not a manual SQL script.
- **SQL injection protection:** The ORM parameterizes all queries automatically, which is critical for a security-focused application.
- **Type safety:** Go structs map directly to database tables. A mistyped column name is a compile-time error, not a runtime crash.
- **Query building:** Complex RBAC permission queries (user → group → bucket → folder) are composed programmatically instead of string-concatenated SQL.

**Trade-off:** ORMs add a small performance overhead and can generate suboptimal queries for complex joins. For performance-critical paths (like permission checks on file access), we can still drop down to raw SQL or use SQLC (which generates type-safe Go code from hand-written SQL).

---


---

## Modules

### Points Summary

| # | Module | Category | Type | Points |
|---|--------|----------|------|--------|
| 1 | Use a framework (frontend + backend) | Web | Major | 2 |
| 2 | Real-time features (WebSockets) | Web | Major | 2 |
| 4 | Public API  | Web | Major | 2 |
| 5 | Standard user management & authentication | User Management | Major | 2 |
| 6 | Organization System (Multi-Tenant) | User Management | Major | 2 |
| 7 | Backend as Microservices | DevOps | Major | 2 |
| 8 | Monitoring (Prometheus + Grafana) | DevOps | Major | 2 |
| 9 | Client-Side Encryption (Zero-Knowledge) | Custom | Major | 2 |
| 10 | ORM (GORM/SQLC) | Web | Minor | 1 |
| 11 | Two-Factor Authentication (TOTP) | User Management | Minor | 1 |
| 12 | File upload and management system | Web | Minor | 1 |
| | | | **Total** | **20** |

---

### Module Details

#### 1. Web Framework — Frontend + Backend (Major, 2pts)

**What:** Go/Fiber for the backend REST API and WebSocket broker. React 18 + TypeScript for the frontend SPA.

**Why it matters for ft_box:** The decoupled frontend/backend architecture is the foundation of our Zero-Knowledge model. The frontend handles all encryption/decryption logic independently, while the backend manages authorization, metadata, and storage orchestration. Fiber was chosen for its Express-like API (familiar DX) combined with Go's performance characteristics.

**Implementation:** Go/Fiber serves the REST API on `/api/v1/*` and the WebSocket endpoint on `/ws`. React handles routing, state (Zustand), and all cryptographic operations via the Web Crypto API.

#### 2. Real-time Features — WebSockets (Major, 2pts)

**What:** Persistent bidirectional connections for live updates across all connected clients.

**Why it matters for ft_box:** When Alice shares a file with Bob, Bob needs to see it instantly — not after a page refresh. WebSockets power: sharing notifications ("Alice shared `report.pdf` with you"), real-time chat between users, online status indicators, and live file activity feeds.

**Implementation:** Go's gorilla/websocket library with room-based broadcasting. Each WebSocket connection runs in its own goroutine. Messages follow a `{ event, room, payload }` protocol. Target latency: < 50ms.

**Why not Long-Polling:** HTTP overhead on every poll, ~500ms minimum latency between messages, and 10x higher server load.

#### 4. Public API — OpenAPI/Swagger (Major, 2pts)

**What:** A documented, secured REST API allowing third-party integrations.

**Why it matters for ft_box:** A storage platform that can only be used through a web UI is limited. The public API lets developers build CLI tools, desktop sync clients, or integrate ft_box into their workflows. API-first design also ensures our own frontend uses the same endpoints as external consumers.

**Implementation:** OpenAPI 3.0 specification in YAML, auto-generated Swagger documentation. Secured with API keys, rate-limited (per-key quotas). Minimum 5 endpoints covering full CRUD: `GET/POST/PUT/DELETE /api/v1/files`, `GET /api/v1/files/{id}/presigned-upload`, etc.

#### 5. Standard User Management & Authentication (Major, 2pts)

**What:** Complete user lifecycle: registration, login, profile management, avatars, friends, online status.

**Why it matters for ft_box:** The user system is the entry point to the entire platform. Secure authentication is doubly important here because compromising a user account means potential access to their encryption keys (stored in-memory during sessions). Passwords are hashed with bcrypt (cost factor 12+) and salted.

**Implementation:**
- Email/password registration with validation
- JWT tokens (1h expiry) + refresh tokens (14 days)
- Profile editing (display name, language preference)

#### 6. Organization System — Multi-Tenant (Major, 2pts)

**What:** Isolated workspaces (organizations) with hierarchical role-based access control (RBAC).

**Why it matters for ft_box:** A collaborative storage platform needs strong multi-tenant isolation. Each organization operates as an independent workspace with its own groups, buckets, and permission tree. This prevents data leakage between tenants and enables fine-grained access control (Admin, Editor, Reader roles).

**Implementation:**
- Create and manage distinct organizations for different projects or companies
- Hierarchical permission model: `Organization → Groups → Users`
- Every SQL query is scoped with the current organization ID to enforce hermetic data separation
- Role assignment (Admin, Editor, Reader) with granular access control on buckets and folders
- GORM-based data isolation at the ORM level

#### 7. Backend as Microservices (Major, 2pts)

**What:** The backend is decomposed into independent microservices orchestrated via Docker Compose.

**Why it matters for ft_box:** A monolithic backend creates a single point of failure and limits scalability. By splitting into dedicated services — API Gateway, Auth Service, Storage Coordinator, WebSocket Broker — each component can be scaled, deployed, and maintained independently. A failure in the chat service doesn't take down file uploads.

**Implementation:**
- **API Gateway (Go/Fiber):** Single entry point handling rate-limiting, initial authentication, and request routing
- **Auth Service:** Dedicated microservice for identity management (JWT, PBKDF2, 2FA validation)
- **Storage Coordinator:** Manages file business logic and MinIO communication via Presigned URLs
- **WebSocket Broker:** Handles persistent TCP connections for chat, online status, and real-time notifications
- All services communicate internally and are orchestrated via Docker Compose

#### 8. Monitoring — Prometheus + Grafana (Major, 2pts)

**What:** Infrastructure and application metrics collection, visualization, and alerting.

**Why it matters for ft_box:** For a storage platform, monitoring is not optional — you need to know *before* the disk fills up, *before* the upload queue saturates, and *before* response times degrade. We aim for **proactive monitoring** ("it will fail in 2 hours") rather than reactive logging ("why did it crash?").

**Implementation:**
- Go/Fiber exposes a `/metrics` endpoint scraped by Prometheus every 15s
- Custom metrics: S3 upload latency, goroutine count, heap size, active WebSocket connections, presigned URL generation rate
- Grafana dashboards: system health, storage usage trends, user activity, API response times
- Alerting rules: disk usage > 80%, API latency P95 > 500ms, goroutine count anomaly

#### 9. Client-Side Encryption — Zero-Knowledge (Major, Custom, 2pts)

**What:** All files are encrypted in the user's browser using AES-GCM 256 before any data leaves the client. The server never has access to decryption keys.

**Why this module deserves Major status (2pts):**

This is ft_box's **core differentiator** and the most technically complex module in the project. It addresses a fundamental trust problem in cloud storage: users must trust the server operator with their data. ft_box eliminates this trust requirement entirely.

**Technical challenges addressed:**
- **Key management:** Deriving encryption keys from a master password via PBKDF2 (100k iterations) without ever transmitting the password or derived key to the server.
- **Secure sharing:** When Alice shares a file with Bob, the system re-encrypts Alice's file key using Bob's public key, creating a unique encrypted key for Bob — without ever exposing the plaintext key to the server.
- **Integrity verification:** AES-GCM's authentication tag (16 bytes) detects any tampering with encrypted data, ensuring files haven't been modified in storage.
- **Performance:** Encrypting large files (multi-GB) in the browser requires chunked streaming via the Web Crypto API to avoid memory exhaustion.

**How it adds value:** This transforms ft_box from "another file storage app" into a genuine privacy tool. It's the architectural foundation that every other feature is built around.

| Detail | Value |
|--------|-------|
| Algorithm | AES-GCM 256 (Galois/Counter Mode) |
| IV Length | 12 bytes (96 bits) |
| Auth Tag | 16 bytes (tamper detection) |
| Key Derivation | PBKDF2, 100k iterations |
| Key Storage | Client memory only (never server) |

#### 10. ORM — GORM/SQLC (Minor, 1pt)

**What:** Object-Relational Mapping layer between Go and PostgreSQL.

**Why it matters for ft_box:** With 10+ database tables and complex RBAC permission queries (user → group → bucket → folder → file), writing raw SQL everywhere would be error-prone and hard to maintain. The ORM provides type-safe queries, automatic migrations, and built-in SQL injection protection. See the [What is an ORM?](#what-is-an-orm) section for a detailed explanation.

#### 11. Two-Factor Authentication — TOTP (Minor, 1pt)

**What:** Time-based One-Time Password authentication using Google Authenticator (or compatible apps).

**Why it matters for ft_box:** In a Zero-Knowledge system, the user's account is the last line of defense. If an attacker compromises a password, 2FA prevents unauthorized access. The user scans a QR code during setup, and must provide a 6-digit rotating code at each login.

**Implementation:** Go library `pquerna/otp` for TOTP generation and validation. QR code generation for authenticator app setup. Backup codes for recovery.

#### 12. File Upload and Management System (Minor, 1pt)

**What:** Complete file upload lifecycle with multi-type support, validation, previews, and access control.

**Why it matters for ft_box:** This is the core user-facing interaction of the platform. Users need to upload files of various types, see upload progress, preview supported formats, and manage (delete) their files — all while maintaining the encryption pipeline.

**Implementation:**
- Support for all file types (images, documents, archives, etc.)
- Client-side validation (type whitelist, size limits) + server-side validation
- Secure storage via presigned URLs with RBAC access control
- File preview for images and PDFs (decrypted client-side)
- Upload progress indicators with chunked transfer
- File deletion with MinIO blob cleanup

---

## Features List

| Feature | Description | Owner(s) |
|---------|------------|----------|
| User registration & login | Email/password auth with bcrypt hashing | `<login>` |
| JWT authentication | Token-based auth with refresh mechanism | `<login>` |
| User profiles | View/edit profile, display name | `<login>` |
| File encryption | AES-GCM 256 client-side encryption | `<login>` |
| File upload/download | Presigned URL-based transfers to/from MinIO | `<login>` |
| File management | Folder hierarchy, rename, delete, move | `<login>` |
| RBAC permissions | Group-based access control on buckets/folders | `<login>` |
| Sharing notifications | Real-time WebSocket notifications | `<login>` |
| Organization management | Create/manage multi-tenant workspaces | `<login>` |
| RBAC roles (Org) | Admin, Editor, Reader role assignment per org | `<login>` |
| Microservices architecture | API Gateway, Auth, Storage, WS Broker | `<login>` |
| Public REST API | OpenAPI/Swagger documented endpoints | `<login>` |
| Prometheus metrics | Custom Go metrics endpoint | `<login>` |
| Grafana dashboards | System health, usage, and performance views | `<login>` |
| 2FA (TOTP) | Google Authenticator integration | `<login>` |
| Privacy Policy page | Accessible legal page with relevant content | `<login>` |
| Terms of Service page | Accessible legal page with relevant content | `<login>` |

---

---

## Project Management


**Tools:**
- **Task tracking:** GitHub Issues + GitHub Projects board
- **Communication:** Discord
- **Code reviews:** GitHub Pull Requests — minimum 1 approval required
- **Documentation:** This README + inline code documentation

---


---

## Resources

### Documentation & References

- [Go Fiber Documentation](https://docs.gofiber.io/)
- [React 18 Documentation](https://react.dev/)
- [Web Crypto API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [AES-GCM (NIST SP 800-38D)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [PBKDF2 (RFC 2898)](https://datatracker.ietf.org/doc/html/rfc2898)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Prometheus Go Client](https://github.com/prometheus/client_golang)
- [GORM Documentation](https://gorm.io/docs/)

### AI Usage

AI tools (Claude, GitHub Copilot) were used during this project for:
- **Architecture brainstorming:** Validating the decoupled storage approach and presigned URL mechanism
- **Code scaffolding:** Generating boilerplate for Fiber routes, GORM models, and React components
- **Documentation:** Drafting API endpoint descriptions and README structure
- **Debugging:** Troubleshooting Docker networking, WebSocket connection issues, and CORS configuration

All AI-generated code was reviewed, tested, and understood by team members before integration. No code was blindly copy-pasted.
