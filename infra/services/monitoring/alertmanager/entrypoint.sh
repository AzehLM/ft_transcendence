#!/bin/sh
set -eu

SECRET_FILE=/run/secrets/discord_webhook_url

if [ ! -r "$SECRET_FILE"]; then
	echo "error: secret file '$SECRET_FILE' is missing or unreadable" >&2
	exit 1
fi

export DISCORD_WEBHOOK_URL="$(tr -d '[:space:]' < "$SECRET_FILE")"
envsubst < /etc/alertmanager/alertmanager.yml.template > /etc/alertmanager/alertmanager.yml
exec "$@"
