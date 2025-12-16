.PHONY: up down build restart logs logs-app logs-db shell db-shell migrate migrate-dev seed clean help

# Docker commands
up:
	docker compose up -d

up-build:
	docker compose up -d --build

down:
	docker compose down

down-clean:
	docker compose down -v

restart:
	docker compose restart

build:
	docker compose build

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

logs-db:
	docker compose logs -f db

# Shell access
shell:
	docker compose exec app sh

db-shell:
	docker compose exec db psql -U postgres -d ai-docs-manager

# Database commands
migrate:
	docker compose exec app npx prisma migrate deploy

migrate-dev:
	npx dotenv -e .env -- npx prisma migrate dev

studio:
	npx dotenv -e .env -- npx prisma studio

install:
	npm ci

# Cleanup
clean:
	docker compose down -v --rmi local
	rm -rf dist node_modules

# Help
help:
	@echo "Available commands:"
	@echo "  make up          - Start containers"
	@echo "  make up-build    - Rebuild and start containers"
	@echo "  make down        - Stop containers"
	@echo "  make down-clean  - Stop containers and remove volumes"
	@echo "  make restart     - Restart containers"
	@echo "  make logs        - Follow all logs"
	@echo "  make logs-app    - Follow app logs"
	@echo "  make logs-db     - Follow database logs"
	@echo "  make shell       - Open shell in app container"
	@echo "  make db-shell    - Open psql in database"
	@echo "  make migrate     - Run migrations in container"
	@echo "  make migrate-dev - Run migrations locally"
	@echo "  make studio      - Open Prisma Studio"
	@echo "  make dev         - Start local dev server"
	@echo "  make clean       - Remove containers, volumes, and node_modules"


# Development with hot reload (Docker)
dev:
	docker compose -f docker-compose.dev.yml up -d --build

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-rebuild:
	docker compose -f docker-compose.dev.yml build --no-cache
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.dev.yml up -d

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f app

# Development (local NestJS + Docker DB)
dev-local:
	docker compose up -d db
	npm run start:dev