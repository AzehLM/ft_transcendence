# Backup & Disaster Recovery

This document describes our backup strategy, retention policy, and the recovery procedures.

## Overview

| What | How | Where | Schedule |
|------|-----|-------|----------|
| PostgreSQL | `pg_dump --format=custom` | `${HOME}/backups/ostrom/` on host | Daily at 02:00 UTC |
| MinIO bucket | `mc mirror` | `${HOME}/backups/ostrom/minio/` on host | Weekly on Sundays at 03:00 UTC |

Backups are managed by a `backup` microservice, scheduled with [supercronic](https://github.com/aptible/supercronic). All jobs log to stdout and are visible via `docker logs backup`. The dev mode has the `-debug` option for verbose outputs.

### MinIO mirror

The MinIO mirror is a local synchronization, not an independent backup service. It protects against accidental volume deletion or local disk failure. It is **not** a substitute for an off-site backup strategy. Given that all stored objects are client-side encrypted, the mirror does not carry confidentiality risk.

## Retention policy

```
${HOME}/backups/ostrom/
├── daily/
│   ├── backup_2026-05-03.dump   ← pg_dump custom format, compressed
│   ├── backup_2026-05-04.dump
│   └── ...                      (7 most recent, oldest auto-deleted)
├── weekly/
│   ├── backup_2026-W18.dump     ← copy of Sunday's daily dump
│   └── ...                      (4 most recent, oldest auto-deleted)
└── minio/
    └── <uuid>                   ← mirrored MinIO objects (mc mirror, no rotation)
```

- **7 daily dumps** ~1 week of point-in-time recovery
- **4 weekly dumps** ~1 month of coverage

## Backup service

### Trigger a backup manually

```sh
docker exec backup backup.sh postgres
docker exec backup backup.sh minio
```

### List available backups

```sh
ls -lh ${HOME}/backups/ostrom/daily/
ls -lh ${HOME}/backups/ostrom/weekly/
```

## Disaster recovery — PostgreSQL

> **Warning:** Restore replaces all current data. Only run this after a confirmed data loss event.

### Prerequisites

- The `backup` container must be running (it has `pg_restore` and access to secrets)
- PostgreSQL must be reachable on the main network (`dev` or `app` depending on dev/prod mode)

### Step 1 — Identify the dump to restore

```sh
docker exec -it backup restore.sh
```

Running `restore.sh` without arguments prints all available backups with sizes and dates.

### Step 2 — Restore

```sh
# Restore the most recent daily backup
docker exec -it backup restore.sh latest

# Restore a specific daily dump
docker exec -it backup restore.sh daily/backup_2026-05-03.dump

# Restore a specific weekly dump
docker exec -it backup restore.sh weekly/backup_2026-W18.dump
```

The script will display the dump details and require you to type `RESTORE` to confirm before proceeding.

### Step 3 — Verify

```sh
docker exec -it postgres psql \
  -U $(cat secrets/postgres/postgres_user.txt) \
  -d $(cat secrets/postgres/postgres_db.txt) \
  -c "\dt"
```

Check that tables are present and row counts look plausible:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM files;
SELECT COUNT(*) FROM folders;
```
> Everything here can be checked in dev mode via the adminer interface which allow easier verification via live table content visualisation


### Step 4 — Restart application services

After a restore, restart the microservices to clear any in-memory state:
The restart is not mandatory, if testing in dev mode, check via adminer interface if everything is fine.
If the backup and the restore has been made manually there is no need for restarting.

```sh
docker compose restart auth orga storage
```

## Disaster recovery — MinIO

MinIO data lives in `${HOME}/backups/ostrom/minio/` (local mirror). In the event of MinIO volume loss.

### Step 1 — Recreate the bucket

```sh
docker exec backup mc alias set ostrom http://minio:9000 \
  $(cat secrets/minio/minio_admin_user.txt) \
  $(cat secrets/minio/minio_admin_pwd.txt)

docker exec backup mc mb ostrom/ostrom
```

### Step 2 — Push the mirror back into MinIO

```sh
docker exec backup mc mirror \
  --overwrite \
  /backups/minio \
  ostrom/ostrom
```

### Step 3 — Verify object count

```sh
docker exec backup mc ls --recursive ostrom/ostrom | wc -l
```

Compare with the expected count from the database:

```sh
docker exec -it postgres psql \
  -U $(cat secrets/postgres/postgres_user.txt) \
  -d $(cat secrets/postgres/postgres_db.txt) \
  -c "SELECT COUNT(*) FROM files WHERE status = 'ACTIVE';"
```

## Host directory setup

The backup directory must exist on the host before starting the stack. It is created automatically on first `docker compose up` if Docker can create it (via makefile rules).

## Known limitations & tradeoffs

- **Local-only**: backups are on the same machine as the database. A full host failure (hardware, fire, etc.) loses both the live data and the backups.
- **No encryption at rest for dumps**: `pg_dump` files are not encrypted on disk. The host filesystem permissions (`/${HOME}/backups/ostrom`, owned by the service user) are the only protection. This is acceptable given that the database already stores all sensitive fields encrypted at the application layer — the plaintext fields (UUIDs, timestamps, `used_space`) carry low sensitivity.
- **MinIO mirror is not versioned**: `mc mirror --remove` keeps the mirror in sync with the live bucket. If a file is deleted from MinIO, it is also deleted from the mirror at the next run.
