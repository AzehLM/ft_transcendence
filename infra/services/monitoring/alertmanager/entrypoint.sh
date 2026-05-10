#!/bin/sh

export DISCORD_WEBHOOK_URL=$(cat /run/secrets/discord_webhook_url)
envsubst < /etc/alertmanager/alertmanager.yml.template > /etc/alertmanager/alertmanager.yml
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml "$@"
