#!/bin/sh
set -e

MINIO_USER=$(cat /run/secrets/minio_admin_user)
MINIO_PWD=$(cat /run/secrets/minio_admin_pwd)
MINIO_URL="http://minio:9000"
BUCKET="ft-box"
JWT_OUTPUT="/jwt/minio_jwt.txt"

echo "[minio-init] configuring mc alias..."
mc alias set local "$MINIO_URL" "$MINIO_USER" "$MINIO_PWD"

echo "[minio-init] creating bucket '$BUCKET' if not exists..."
mc mb --ignore-existing "local/$BUCKET"

echo "[minio-init] generating Prometheus JWT..."
# Output is YAML: "  bearer_token: <token>"
TOKEN=$(mc admin prometheus generate local | awk '/bearer_token:/ {print $2}')

if [ -z "$TOKEN" ]; then
  echo "[minio-init] ERROR: failed to generate JWT"
  exit 1
fi

echo "$TOKEN" > "$JWT_OUTPUT"
echo "[minio-init] JWT written to $JWT_OUTPUT"

echo "[minio-init] done."
  