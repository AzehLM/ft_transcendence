#!/bin/sh

# backup.sh — called by supercronic with "postgres" or "minio" as argument
# Usage (via crontab):
#   backup.sh postgres   — pg_dump + daily/weekly rotation
#   backup.sh minio      — mc mirror of the ostrom bucket
# Secrets are read from Docker secrets mounted at /run/secrets/

set -eu

MODE="${1:-postgres}"
BACKUP_ROOT="/backups"
BACKUP_DAILY_DIR="${BACKUP_ROOT}/daily"
BACKUP_WEEKLY_DIR="${BACKUP_ROOT}/weekly"
MINIO_MIRROR_DIR="${BACKUP_ROOT}/minio"

mkdir -p "$BACKUP_DAILY_DIR" "$BACKUP_WEEKLY_DIR" "$MINIO_MIRROR_DIR"

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

backup_postgres() {
	PGHOST="${POSTGRES_HOST:-postgres}"
	PGPORT="${POSTGRES_PORT:-5432}"
	PGDATABASE="$(read_secret postgres_db)"
	PGUSER="$(read_secret postgres_user)"

	# exporting the password because pg_dump reads the password from the environment (it is executed in a sub-shell and it doesn't herit from the password without it)
	export PGPASSWORD="$(read_secret postgres_pwd)"

	DATE="$(date -u '+%Y-%m-%d')"
	WEEKNUM="$(date -u '+%Y-W%V')"
	DOW="$(date -u '+%u')"

	DAILY_FILE="${BACKUP_DAILY_DIR}/backup_${DATE}.dump"
	WEEKLY_FILE="${BACKUP_WEEKLY_DIR}/backup_${WEEKNUM}.dump"

	log "Starting PostgreSQL backup: database=${PGDATABASE} host=${PGHOST}"

	pg_dump \
		--host="$PGHOST" \
		--port="$PGPORT" \
		--username="$PGUSER" \
		--dbname="$PGDATABASE" \
		--format=custom \
		--compress=9 \
		--no-password \
		--file="$DAILY_FILE"

	log "Dump written to $DAILY_FILE ($(du -sh "$DAILY_FILE" | cut -f1))"

	if [ "$DOW" = "7" ]; then
		cp "$DAILY_FILE" "$WEEKLY_FILE"
		log "Weekly copy written to $WEEKLY_FILE"
	fi

	# Rotation: keep 7 most recent daily dumps
	DAILY_COUNT="$(ls -1 "${BACKUP_DAILY_DIR}"/backup_*.dump 2>/dev/null | wc -l)"
	if [ "$DAILY_COUNT" -gt 7 ]; then
		ls -1t "${BACKUP_DAILY_DIR}"/backup_*.dump | tail -n +8 | while read -r old; do
			log "Removing old daily backup: $old"
			rm -f "$old"
		done
	fi

	# Rotation: keep 4 most recent weekly dumps
	WEEKLY_COUNT="$(ls -1 "${BACKUP_WEEKLY_DIR}"/backup_*.dump 2>/dev/null | wc -l)"
	if [ "$WEEKLY_COUNT" -gt 4 ]; then
		ls -1t "${BACKUP_WEEKLY_DIR}"/backup_*.dump | tail -n +5 | while read -r old; do
			log "Removing old weekly backup: $old"
			rm -f "$old"
		done
	fi

	log "PostgreSQL backup complete. Daily: $(ls -1 "${BACKUP_DAILY_DIR}"/backup_*.dump 2>/dev/null | wc -l)/7, Weekly: $(ls -1 "${BACKUP_WEEKLY_DIR}"/backup_*.dump 2>/dev/null | wc -l)/4"

	unset PGPASSWORD
}

backup_minio() {
	MINIO_HOST="${MINIO_HOST:-minio}"
	MINIO_PORT="${MINIO_PORT:-9000}"
	MINIO_USER="$(read_secret minio_admin_user)"
	MINIO_PWD="$(read_secret minio_admin_pwd)"
	BUCKET="${MINIO_BUCKET:-ostrom}"

	log "Configuring mc alias..."
	mc alias set ostrom "http://${MINIO_HOST}:${MINIO_PORT}" "$MINIO_USER" "$MINIO_PWD" --quiet

	log "Starting MinIO mirror: bucket=${BUCKET} -> ${MINIO_MIRROR_DIR}"
	mc mirror --overwrite --remove "ostrom/${BUCKET}" "$MINIO_MIRROR_DIR"

	OBJECT_COUNT="$(find "$MINIO_MIRROR_DIR" -type f | wc -l)"
	TOTAL_SIZE="$(du -sh "$MINIO_MIRROR_DIR" | cut -f1)"
	log "MinIO mirror complete. Objects: ${OBJECT_COUNT}, Total size: ${TOTAL_SIZE}"
}

case "$MODE" in
	postgres) backup_postgres ;;
	minio)    backup_minio ;;
	*)
		log "ERROR: unknown mode '$MODE'. Expected: postgres | minio"
		exit 1
		;;
esac
