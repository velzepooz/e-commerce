# Docker Compose commands for MongoDB
.PHONY: infra-start infra-stop

# Start MongoDB with Docker Compose
infra-start:
	docker compose up -d

# Stop MongoDB containers
infra-stop:
	docker compose down

# Setup MinIO buckets and other infrastructure
infra-setup: infra-start
	@echo "Waiting for MinIO to be ready..."
	@sleep 10
	@echo "Creating MinIO buckets..."
	@docker exec minio mc alias set myminio http://localhost:9000 minio minio123
	@docker exec minio mc mb myminio/orders --ignore-existing || true
	@echo "Buckets created successfully!"
	@docker exec minio mc ls myminio

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
