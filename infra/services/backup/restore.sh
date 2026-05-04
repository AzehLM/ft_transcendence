#!/bin/sh

# restore.sh — PostgreSQL disaster recovery
# Usage:
#   restore.sh latest                       — restore the most recent daily backup
#   restore.sh daily/backup_2026-05-03.dump — restore a specific dump
#   restore.sh weekly/backup_2026-W18.dump  — restore a specific weekly dump
# This script MUST be run manually (never by cron).
# It will DROP and recreate the target database — all current data will be lost.

set -eu

BACKUP_ROOT="/backups"

log() {
	echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

read_secret() {
	path="/run/secrets/${1}"
	if [ ! -f "$path" ]; then
		log "ERROR: secret not found: $path"
		exit 1
	fi
	cat "$path"
}

TARGET="${1:-}"

if [ -z "$TARGET" ]; then
	echo ""
	echo "Usage: restore.sh <latest | path/to/backup.dump>"
	echo ""
	echo "Available backups:"
	echo ""
	echo "  Daily (most recent first):"
	ls -1t "${BACKUP_ROOT}/daily"/backup_*.dump 2>/dev/null | while read -r f; do
		echo "    daily/$(basename "$f")  ($(du -sh "$f" | cut -f1))"
	done
	echo ""
	echo "  Weekly:"
	ls -1t "${BACKUP_ROOT}/weekly"/backup_*.dump 2>/dev/null | while read -r f; do
		echo "    weekly/$(basename "$f")  ($(du -sh "$f" | cut -f1))"
	done
	echo ""
	exit 1
fi

if [ "$TARGET" = "latest" ]; then
	DUMP_FILE="$(ls -1t "${BACKUP_ROOT}/daily"/backup_*.dump 2>/dev/null | head -1)"
	if [ -z "$DUMP_FILE" ]; then
		log "ERROR: no daily backup found in ${BACKUP_ROOT}/daily/"
		exit 1
	fi
else
	# Accept both "daily/backup_X.dump" and absolute paths
	if [ -f "$TARGET" ]; then
		DUMP_FILE="$TARGET"
	elif [ -f "${BACKUP_ROOT}/${TARGET}" ]; then
		DUMP_FILE="${BACKUP_ROOT}/${TARGET}"
	else
		log "ERROR: file not found: $TARGET"
		exit 1
	fi
fi

DUMP_SIZE="$(du -sh "$DUMP_FILE" | cut -f1)"
DUMP_DATE="$(date -r "$DUMP_FILE" -u '+%Y-%m-%d %H:%M:%S UTC' 2>/dev/null || stat -c '%y' "$DUMP_FILE")"

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│              DISASTER RECOVERY — RESTORE            │"
echo "└─────────────────────────────────────────────────────┘"
echo ""
echo "  Dump file : $DUMP_FILE"
echo "  Size      : $DUMP_SIZE"
echo "  Created   : $DUMP_DATE"
echo ""
echo "  WARNING: This will DESTROY all current data in the"
echo "  database and replace it with the contents of this dump."
echo ""
printf "  Type RESTORE to confirm: "
read -r CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
	log "Aborted."
	exit 1
fi

PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGDATABASE="$(read_secret postgres_db)"
PGUSER="$(read_secret postgres_user)"
export PGPASSWORD="$(read_secret postgres_pwd)"

log "Restoring $DUMP_FILE into database '${PGDATABASE}' on ${PGHOST}:${PGPORT}..."

# Drop all existing connections first
psql \
	--host="$PGHOST" \
	--port="$PGPORT" \
	--username="$PGUSER" \
	--dbname="postgres" \
	--no-password \
	-c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" \
	> /dev/null 2>&1 || true

pg_restore \
	--host="$PGHOST" \
	--port="$PGPORT" \
	--username="$PGUSER" \
	--dbname="$PGDATABASE" \
	--no-password \
	--clean \
	--if-exists \
	--single-transaction \
	--verbose \
	"$DUMP_FILE"

log "Restore complete. Database '${PGDATABASE}' has been restored from: $(basename "$DUMP_FILE")"

unset PGPASSWORD
