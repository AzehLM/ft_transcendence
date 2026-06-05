export DOCKER_BUILDKIT=1

-include .env
export

ENV_FILE			:= .env
ENV_EXAMPLE			:= .env.example

DOMAIN_NAME := $(shell hostname)

COMPOSE_FILE		:= infra/docker-compose.yml
COMPOSE_DEV_FILE	:= infra/docker-compose.dev.yml
COMPOSE_CMD			:= docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE)
COMPOSE_DEV_CMD		:= docker compose -f $(COMPOSE_DEV_FILE) --env-file $(ENV_FILE)

SECRETS_PATH		:= secrets/
GRAFANA_PATH		:= $(SECRETS_PATH)grafana/

SSL_PATH		:= $(SECRETS_PATH)ssl/
HOSTNAME_FILE	:= $(SSL_PATH).hostname
CERT_PATH		:= $(SSL_PATH)cert.pem
KEY_PATH		:= $(SSL_PATH)key.pem

$(SECRETS_PATH) $(SSL_PATH):
	@mkdir -p $@

BACKUP_DIR			:= $(or $(HOME),/tmp)/backups/ostrom/

BACKUP_DAILY_DIR	:= $(BACKUP_DIR)daily
BACKUP_WEEKLY_DIR	:= $(BACKUP_DIR)weekly
BACKUP_MINIO_DIR	:= $(BACKUP_DIR)minio

$(BACKUP_DIR) $(BACKUP_DAILY_DIR) $(BACKUP_WEEKLY_DIR) $(BACKUP_MINIO_DIR):
	@mkdir -p $@
	@chmod 777 $@

$(ENV_FILE):
	@[ -f $(ENV_EXAMPLE) ] || (echo "Error: $(ENV_EXAMPLE) not found" && exit 1)
	cp $(ENV_EXAMPLE) $(ENV_FILE)
	@echo "[setup] $(ENV_FILE) created from $(ENV_EXAMPLE) - edit it before running."


$(CERT_PATH) $(KEY_PATH): $(HOSTNAME_FILE)
	@openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
		-subj "/C=FR/ST=France/L=Lyon/O=42Lyon/OU=DevOps/CN=$(DOMAIN_NAME)" \
		-addext "subjectAltName=DNS:$(DOMAIN_NAME),DNS:localhost,IP:127.0.0.1" \
		-keyout $(KEY_PATH) -out $(CERT_PATH)

$(HOSTNAME_FILE): | $(SSL_PATH)
	@if [ ! -f $@ ] || [ "$$(cat $@)" != "$(DOMAIN_NAME)" ]; then \
		echo "$(DOMAIN_NAME)" > $@; \
	fi

.PHONY: dirs
dirs: $(BACKUP_DIR) $(BACKUP_DAILY_DIR) $(BACKUP_WEEKLY_DIR) $(BACKUP_MINIO_DIR)

.PHONY: ssl
ssl: $(CERT_PATH) $(KEY_PATH)

.PHONY: setup
setup: $(ENV_FILE)
	@bash scripts/setup.sh

# ---------------------------------- rules -------------------------------------

.DEFAULT_GOAL := up

.PHONY: up
up: setup $(CERT_PATH) $(KEY_PATH) dirs
	$(COMPOSE_CMD) up -d --build --remove-orphans

.PHONY: dev
dev: setup $(CERT_PATH) $(KEY_PATH) dirs
	$(COMPOSE_DEV_CMD) up -d --build --remove-orphans

.PHONY: stop
stop:
	@$(COMPOSE_DEV_CMD) stop
	@$(COMPOSE_CMD) stop

.PHONY: down
down:
	@$(COMPOSE_DEV_CMD) down
	@$(COMPOSE_CMD) down

.PHONY: re
re: down
	$(MAKE) up

.PHONY: re-dev
re-dev: down
	$(MAKE) dev

# --------------------------- logs / exec / debug ------------------------------

.PHONY: logs
logs:
	$(COMPOSE_CMD) logs -f

.PHONY: logs-service
logs-service:
	@[ -n "$(word 2,$(MAKECMDGOALS))" ] \
		|| (echo "Usage: make logs-service <service>" && exit 1)
	$(COMPOSE_CMD) logs -f $(word 2,$(MAKECMDGOALS))

.PHONY: exec
exec:
	@[ -n "$(word 2,$(MAKECMDGOALS))" ] \
		|| (echo "Usage: make exec <service>" && exit 1)
	$(COMPOSE_CMD) exec $(word 2,$(MAKECMDGOALS)) sh

# rules to help check
.PHONY: reset-quota
reset-quota:
	@[ -n "$(email)" ] || (echo "Usage: make reset-quota email=<email>" && exit 1)
	@docker exec postgres sh -lc 'psql -U "$$(cat /run/secrets/postgres_user)" -d "$$(cat /run/secrets/postgres_db)" \
		-c "UPDATE users SET used_space = 0 WHERE email = '\''$(email)'\'';"' 2>/dev/null
	@echo "[reset-quota] Quota reset for $(email)"

.PHONY: saturate-quota
saturate-quota:
	@[ -n "$(email)" ] || (echo "Usage: make saturate-quota email=<email>" && exit 1)
	@docker exec postgres sh -lc 'psql -U "$$(cat /run/secrets/postgres_user)" -d "$$(cat /run/secrets/postgres_db)" \
		-c "UPDATE users SET used_space = max_space WHERE email = '\''$(email)'\'';"' 2>/dev/null
	@echo "[saturate-quota] Quota saturated for $(email)"

.PHONY: backup
backup:
	@[ -n "$(type)" ] || (echo "Usage: make backup type=<postgres|minio>" && exit 1)
	@docker exec backup backup.sh $(type)

.PHONY: backup-list
backup-list:
	@echo "\n=== Daily ==="; ls -lht $(BACKUP_DAILY_DIR)/*.dump 2>/dev/null || echo "  (none)"
	@echo "\n=== Weekly ==="; ls -lht $(BACKUP_WEEKLY_DIR)/*.dump 2>/dev/null || echo "  (none)"
	@echo "\n=== MinIO mirror ==="; du -sh $(BACKUP_MINIO_DIR) 2>/dev/null || echo "  (none)"

.PHONY: backup-restore
backup-restore:
	@[ -n "$(dump)" ] || (echo "Usage: make backup-restore dump=<latest|daily/backup_X.dump|weekly/backup_X.dump>" && exit 1)
	docker exec -it backup restore.sh $(dump)

.PHONY: backup-test-rotation
backup-test-rotation:
	@echo "[test] Creating dummy dump files to test rotation logic..."
	@for i in 1 2 3 4 5 6 7 8 9; do \
		touch $(BACKUP_DAILY_DIR)/backup_2026-05-0$${i}.dump; \
	done
	@echo "[test] Created 9 dummy daily dumps. Running backup-list:"
	@$(MAKE) backup-list
	@echo "[test] Now trigger a real backup to see rotation in action:"
	@echo "       make backup type=postgres"

# --------------------------------- cleanup ------------------------------------

.PHONY: clean
clean: down
	@docker system prune -af
	@docker volume prune -f

.PHONY: fclean
fclean: clean
#	@$(COMPOSE_CMD) down --volumes --remove-orphans
	@$(COMPOSE_DEV_CMD) down --volumes --remove-orphans
	@rm -rf frontend/node_modules frontend/dist
	@rm -rf ${HOME}/backups
	@rm -rf $(SSL_PATH)*

.PHONY: db-reset
db-reset:
	@echo "[db-reset] Truncating all tables..."
	@docker exec postgres psql \
		-U $$(cat secrets/postgres/postgres_user.txt) \
		-d $$(cat secrets/postgres/postgres_db.txt) \
		-c "TRUNCATE users, organizations, org_members, files, folders CASCADE;" >/dev/null
	@echo "[db-reset] Done. Current counts:"
	@docker exec postgres psql \
		-U $$(cat secrets/postgres/postgres_user.txt) \
		-d $$(cat secrets/postgres/postgres_db.txt) \
		-c "SELECT 'users' AS table, COUNT(*) FROM users \
			UNION ALL SELECT 'organizations', COUNT(*) FROM organizations \
			UNION ALL SELECT 'org_members', COUNT(*) FROM org_members \
			UNION ALL SELECT 'folders', COUNT(*) FROM folders \
			UNION ALL SELECT 'files', COUNT(*) FROM files;"

.PHONY: minio-reset
minio-reset:
	@echo "[minio-reset] Removing and recreating bucket 'ostrom'..."
	@docker exec backup sh -c \
		'mc alias set ostrom http://$${MINIO_HOST:-minio}:$${MINIO_PORT:-9000} \
		"$$(cat /run/secrets/minio_admin_user)" \
		"$$(cat /run/secrets/minio_admin_pwd)" --quiet \
		&& mc rb --force ostrom/ostrom \
		&& mc mb ostrom/ostrom'
	@echo "[minio-reset] Done. Bucket 'ostrom' is empty."

# --------------------------------- CI/CD ------------------------------------

.PHONY: lint-storage
lint-storage:
	@if [ -n "$$(find backend/storage -name '*.go' 2>/dev/null)" ]; then \
		cd backend/storage && golangci-lint run ./...; \
	else \
		echo "No Go files found, skipping lint." && exit 0; \
	fi

.PHONY: lint-auth
lint-auth:
	@if [ -n "$$(find backend/auth -name '*.go' 2>/dev/null)" ]; then \
		cd backend/auth && golangci-lint run ./...; \
	else \
		echo "No Go files found, skipping lint." && exit 0; \
	fi

.PHONY: lint-orga
lint-orga:
	@if [ -n "$$(find backend/orga -name '*.go' 2>/dev/null)" ]; then \
		cd backend/orga && golangci-lint run ./...; \
	else \
		echo "No Go files found, skipping lint." && exit 0; \
	fi

.PHONY: lint-shared
lint-shared:
	@if [ -n "$$(find backend/shared -name '*.go' 2>/dev/null)" ]; then \
		cd backend/shared && golangci-lint run ./...; \
	else \
		echo "No Go files found, skipping lint." && exit 0; \
	fi

# Dummy target to absorb arguments passed to logs-service / exec
%:
	@:
