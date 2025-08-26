.PHONY: infra-start infra-stop infra-setup infra-clean

# Start all infrastructure services
infra-start:
	@echo Starting infrastructure services...
	docker compose up -d
	@echo Infrastructure services started

# Stop all infrastructure services
infra-stop:
	@echo Stopping infrastructure services...
	docker compose down
	@echo Infrastructure services stopped

# Setup infrastructure (buckets, databases, etc.)
infra-setup: infra-start
	@echo Waiting for services to be ready...
	@sleep 10
	@echo Setting up MinIO buckets...
	@docker exec minio mc alias set myminio http://localhost:9000 minio minio123 || true
	@docker exec minio mc mb myminio/orders --ignore-existing || true
	@echo MinIO buckets created successfully!
	@docker exec minio mc ls myminio
	@echo Infrastructure setup complete!

# Clean up infrastructure (remove volumes)
infra-clean:
	@echo Cleaning up infrastructure...
	docker compose down -v
	@echo Infrastructure cleaned up


.PHONY: install

# Install dependencies
install:
	@echo Installing dependencies...
	pnpm install
	@echo Dependencies installed

.PHONY: build dev start

# Build all services
build:
	@echo Building all services...
	pnpm run build
	@echo Build complete

# Start development mode
dev: dev-order dev-invoice

# Start order service in development mode
dev-order:
	@echo Starting order service in development mode...
	pnpm run start:dev order-service

# Start invoice service in development mode
dev-invoice:
	@echo Starting invoice service in development mode...
	pnpm run start:dev invoice-service

# Start infrastructure and then development
start: infra-setup
	@echo Waiting for services to be ready...
	@sleep 5
	@echo Installing dependencies...
	@make install
	@echo Starting development mode...
	@echo Starting services in parallel...
	@make dev-order & make dev-invoice & wait

# Start infrastructure and then development for invoice service
start-invoice: infra-start
	@echo Waiting for services to be ready...
	@sleep 5
	@echo Installing dependencies...
	@make install
	@echo Starting development mode...
	@echo Starting services in parallel...
	@make dev-invoice

# Start infrastructure and then development for order service
start-order: infra-start
	@echo Waiting for services to be ready...
	@sleep 5
	@echo Installing dependencies...
	@make install
	@echo Starting development mode...
	@echo Starting services in parallel...
	@make dev-order

.PHONY: test test-unit test-coverage test-e2e test-order test-invoice

# Run all tests
test: test-unit test-e2e

# Run unit tests for all services
test-unit:
	@echo Running unit tests...
	pnpm run test
	@echo Unit tests complete

# Run tests with coverage
test-coverage:
	@echo Running tests with coverage...
	pnpm run test:cov
	@echo Coverage report generated

# Run end-to-end tests
test-e2e:
	@echo Running end-to-end tests...
	pnpm run test:e2e
	@echo E2E tests complete

# Run all tests for order service
test-order:
	@echo Running tests for order service...
	pnpm run test order-service
	@echo Order service tests complete

# Run all tests for invoice service
test-invoice:
	@echo Running tests for invoice service...
	pnpm run test invoice-service
	@echo Invoice service tests complete

.PHONY: lint

# Run linting
lint:
	@echo Running linting...
	pnpm run lint
	@echo Linting complete

