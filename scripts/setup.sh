#!/usr/bin/env sh

SECRETS_PATH="secrets/"

gen_secret() {
    openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"
}

write_secret() {
    local file="$1"
    local value="$2"
    if [ ! -f "$file" ]; then
        printf '%s' "$value" > "$file"
        echo "[setup] Created $file"
    fi
}

echo "[setup] Secrets generation..."

mkdir -p \
    "${SECRETS_PATH}postgres" \
    "${SECRETS_PATH}minio" \
    "${SECRETS_PATH}redis" \
    "${SECRETS_PATH}grafana"

# --- PostgreSQL ---
write_secret "${SECRETS_PATH}postgres/postgres_user.txt" "ostrom"
write_secret "${SECRETS_PATH}postgres/postgres_db.txt"   "ostrom_db"
write_secret "${SECRETS_PATH}postgres/postgres_pwd.txt"  "$(gen_secret 32)"

# --- MinIO ---
write_secret "${SECRETS_PATH}minio/minio_admin_user.txt" "ostrom_minio"
write_secret "${SECRETS_PATH}minio/minio_admin_pwd.txt"  "$(gen_secret 32)"

# --- Redis ---
write_secret "${SECRETS_PATH}redis/redis_pwd.txt" "$(gen_secret 32)"

# --- Grafana ---
write_secret "${SECRETS_PATH}grafana/grafana_admin_user.txt" "admin"
write_secret "${SECRETS_PATH}grafana/grafana_admin_pwd.txt"  "$(gen_secret 24)"

# --- JWT ---
write_secret "${SECRETS_PATH}jwt_secret" "$(gen_secret 64)"

# --- Human secrets ---
for file in "${SECRETS_PATH}cloudflare_tunnel_token" "${SECRETS_PATH}discord_webhook_url"; do
    if [ ! -f "$file" ] || [ ! -s "$file" ]; then
        printf '' > "$file"
        echo "[setup] Fill $file manually"
    fi
done

# --- .env ---
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[setup] .env created from .env.example - edit before running"
fi

echo "[setup] Done."
