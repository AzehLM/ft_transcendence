export DOCKER_BUILDKIT=1

ENV_FILE			:= .env
ENV_EXAMPLE			:= .env.example

COMPOSE_FILE		:= infra/docker-compose.yml
COMPOSE_DEV_FILE	:= infra/docker-compose.dev.yml
COMPOSE_CMD			:= docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE)
COMPOSE_DEV_CMD		:= docker compose -f $(COMPOSE_DEV_FILE) --env-file $(ENV_FILE)

SECRETS_PATH		:= secrets/
GRAFANA_PATH		:= $(SECRETS_PATH)grafana/

$(SECRETS_PATH):
	mkdir -p $@

# List of the microservices in the speficied $(COMPOSE_FILE)
SERVICES := $(shell docker compose -f $(COMPOSE_FILE) config --services)

$(ENV_FILE):
	@[ -f $(ENV_EXAMPLE) ] || (echo "Error: $(ENV_EXAMPLE) not found" && exit 1)
	cp $(ENV_EXAMPLE) $(ENV_FILE)
	@echo "$(ENV_FILE) created from $(ENV_EXAMPLE) — edit it before running."

# ---------------------------------- rules -------------------------------------

# dev for now, will be switched for up later
.DEFAULT_GOAL := dev

.PHONY: up
up: $(ENV_FILE)
	$(COMPOSE_CMD) up -d --build

# watch mode beta-test here, not sure how it will look like as it also needs watch configuration in the $(COMPOSE_DEV_FILE)
# to be defined
.PHONY: dev
dev: $(ENV_FILE)
	$(COMPOSE_DEV_CMD) up -d --build --remove-orphans

.PHONY: watch
watch: $(ENV_FILE)
	$(COMPOSE_DEV_CMD) up --build --watch --remove-orphans

.PHONY: stop
stop:
	$(COMPOSE_CMD) stop

.PHONY: down
down:
	@$(COMPOSE_DEV_CMD) down
	@$(COMPOSE_CMD) down

.PHONY: re
re: down
	$(MAKE) up

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

# --------------------------------- cleanup ------------------------------------

.PHONY: clean
clean: down
	@docker system prune -af
	@docker volume prune -f

.PHONY: fclean
fclean: clean
	@# $(COMPOSE_CMD) down --volumes --remove-orphans
	@$(COMPOSE_DEV_CMD) down --volumes --remove-orphans
	@rm -rf frontend/node_modules frontend/dist

# --------------------------------- CI/CD ------------------------------------

# only runs golangci-lint in the backend directory yet, might have to be updated depending on future architecture
.PHONY: lint-back
lint-back:
	@if [ -n "$$(find backend -name '*.go' 2>/dev/null)" ]; then \
		cd backend/files && golangci-lint run ./...; \
	else \
		echo "No Go files found, skipping lint." && exit 0; \
	fi

# Dummy target to absorb arguments passed to logs-service / exec
%:
	@:
