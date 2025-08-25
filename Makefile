# Docker Compose commands for MongoDB
.PHONY: infra-start infra-stop

# Start MongoDB with Docker Compose
infra-start:
	docker compose up -d

# Stop MongoDB containers
infra-stop:
	docker compose down

# Install dependencies
install:
	pnpm install

# Start the order service in development mode
dev:
	pnpm run start:dev

# Start MongoDB and then the order service
start: infra-start
	@echo "Waiting for MongoDB to be ready..."
	@sleep 5
	pnpm run start:dev
