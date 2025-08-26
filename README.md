# E-Commerce Platform

A microservices-based e-commerce platform built with NestJS, featuring order management, invoice processing, and event-driven architecture.

## Architecture Overview

The platform consists of two core microservices and shared infrastructure:

- **Order Service**: Manages orders, status transitions, and publishes events
- **Invoice Service**: Handles invoice uploads, storage, and delivery
- **Shared Infrastructure**: MongoDB, RabbitMQ, MinIO (S3-compatible storage)

### Technology Stack

- **Framework**: NestJS with Fastify adapter
- **Database**: MongoDB with Mongoose ORM
- **Message Broker**: RabbitMQ for event-driven communication
- **File Storage**: S3-compatible storage (MinIO for local development)
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## Services

### Order Service (`apps/order-service/`)

**Purpose**: Core order management and lifecycle handling

**Key Features**:
- Idempotent order creation with business validation
- Order status management with transition rules
- Event publishing for order status changes
- RESTful API with comprehensive validation

**API Endpoints**:
- `POST /orders` - Create new order (idempotent)
- `GET /orders/:id` - Get order by ID
- `PATCH /orders/:id/status` - Update order status
- `GET /orders` - List orders with pagination
- `GET /healthz` - Health check

**Business Logic**:
- Status transitions: CREATED → ACCEPTED → SHIPPING_IN_PROGRESS → SHIPPED
- Unique constraint: sellerId + clientOrderId + customerId
- Event publishing to RabbitMQ for downstream services

**Port**: 3000

### Invoice Service (`apps/invoice-service/`)

**Purpose**: Invoice file management and delivery

**Key Features**:
- PDF invoice upload and validation
- S3 storage integration with organized file structure
- Pre-signed URL generation for secure file access
- Order status event consumption
- Duplicate invoice prevention

**API Endpoints**:
- `POST /invoices/upload` - Upload invoice PDF
- `GET /invoices` - List invoices with filters
- `GET /invoices/:id` - Get invoice details
- `GET /invoices/:id/url` - Generate download URL
- `GET /healthz` - Health check

**File Handling**:
- PDF validation and size limits
- S3 bucket organization: `{orderId}/invoices/{filename}`
- Secure pre-signed URLs with configurable TTL

**Port**: 3010

## Infrastructure

### MongoDB
- **Purpose**: Primary data store for both services
- **Port**: 27018
- **Databases**: 
  - `orders` - Order service data
  - `invoices` - Invoice service data
- **Connection**: `mongodb://user:password@localhost:27018`

### RabbitMQ
- **Purpose**: Message broker for inter-service communication
- **Port**: 5672 (AMQP), 15672 (Management UI)
- **Queues**:
  - `invoice-service.orders-status` - Order status change events
- **Events**:
  - `orders.statusChanged` - Published by order service, consumed by invoice service

### MinIO (S3-Compatible Storage)
- **Purpose**: File storage for invoice PDFs
- **Port**: 9000 (API), 9001 (Console)
- **Credentials**: minio/minio123
- **Buckets**: `orders` (for invoice storage)
- **Console**: http://localhost:9001

## Event Flow

### Order Status Change Workflow

1. **Order Service** receives status update request
2. **Business Rules** validate status transition
3. **Database** is updated with new status
4. **Event Published** to RabbitMQ: `orders.statusChanged`
5. **Invoice Service** consumes the event
6. **Order Projection** is updated in invoice service
7. **Invoice Delivery** workflow is triggered if applicable

### Event Payload Structure

```typescript
interface OrderStatusChangedEventPayload {
  eventId: string;
  occurredAt: string;
  orderId: string;
  status: OrderStatus;
}
```

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm package manager
- MongoDB 6+
- RabbitMQ 3.8+

### Quick Start

```bash
# Complete setup (infrastructure + dependencies + development)
make start

# Or step by step:
make infra-setup    # Start and setup infrastructure
make install        # Install dependencies
make dev            # Start development mode
```

### Infrastructure Management

```bash
# Start/stop infrastructure services
make infra-start    # Start MongoDB, MinIO, RabbitMQ
make infra-stop     # Stop all services
make infra-setup    # Start + setup MinIO buckets
make infra-clean    # Stop + remove volumes
```

### Development Commands

```bash
# Start development mode
make dev            # Start both services
make dev-order      # Start order service only
make dev-invoice    # Start invoice service only

# Building
make build          # Build all services
```

### Testing

```bash
# Run all tests
make test           # Unit + E2E tests
make test-unit      # Unit tests only
make test-e2e       # End-to-end tests only
make test-coverage  # Tests with coverage report

# Service-specific testing
make test-order     # Order service tests
make test-invoice   # Invoice service tests
```

### Code Quality

```bash
make lint           # Run ESLint
```

### Dependencies

```bash
make install        # Install dependencies
```

## Service URLs & Health Checks

After running `make infra-start`, services are available at:

### Infrastructure
- **MongoDB**: `mongodb://user:password@localhost:27018`
- **MinIO Console**: http://localhost:9001 (minio/minio123)
- **RabbitMQ Management**: http://localhost:15672 (user/password)

### Services
- **Order Service**: http://localhost:3000
  - API: http://localhost:3000/orders/docs
  - Health: http://localhost:3000/healthz
- **Invoice Service**: http://localhost:3010
  - API: http://localhost:3010/invoices/docs
  - Health: http://localhost:3010/healthz

## Configuration

### Environment Variables

Both services use similar configuration patterns:

#### Order Service
```bash
ENV=local
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
MONGO_URL=mongodb://user:password@localhost:27018
DB_NAME=orders
RABBITMQ_URL=amqp://user:password@localhost:5672
```

#### Invoice Service
```bash
ENV=local
NODE_ENV=development
HOST=0.0.0.0
PORT=3010
MONGO_URL=mongodb://user:password@localhost:27018
DB_NAME=invoices
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio123
INVOICE_BUCKET_NAME=orders
S3_URL_TTL_SEC_DEFAULT=300
RABBITMQ_URL=amqp://user:password@localhost:5672
RABBIT_PREFETCH=50
```

## Testing Strategy

### Test Structure
- **Unit Tests**: Service and repository layer testing
- **E2E Tests**: Full API integration testing
- **Test Factories**: Data generation for tests
- **Mock Services**: Isolated testing of components

### Test Data
- Sample PDF files for invoice testing
- Factory functions for creating test entities
- Database seeding and cleanup utilities

## Deployment

### Local Development
```bash
make start          # Infrastructure + both services
make start-order    # Infrastructure + order service only
make start-invoice  # Infrastructure + invoice service only
```

### Production Build
```bash
make build          # Build all services
pnpm start:prod     # Start production servers
```

### Docker
```bash
make infra-start  # Start all services
make infra-stop # Stop all services
```

## Monitoring & Observability

### Health Checks
- Service health endpoints (`/healthz`)
- Database connection status

## Security Features

### Input Validation
- DTO-based request validation
- File type and size restrictions

### File Security
- Pre-signed URLs with TTL
- PDF file validation
- Secure file storage paths
- Access control through business logic

### Error Handling
- Secure error messages
- No information leakage
- Proper HTTP status codes
- Validation error details

## Development Workflow

1. **First time setup**: `make start` (infrastructure + dev)
2. **Daily development**: `make dev`
3. **Testing**: `make test`
4. **Code quality**: `make lint`
5. **Stop infra**: `make infra-stop` (stop docker containers)
6. **Cleanup**: `make infra-clean` (stop containers + remove volumes)


## Documentation

- **Order Service**: [apps/order-service/README.md](apps/order-service/README.md)
- **Invoice Service**: [apps/invoice-service/README.md](apps/invoice-service/README.md)
- **API Documentation**: Available at service URLs when running

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Order service: 3000
   - Invoice service: 3010
   - Ensure ports are available

2. **Database Connection**
   - Check MongoDB is running on port 27018
   - Verify connection strings in environment files

3. **File Storage Issues**
   - Ensure MinIO is running and accessible
   - Check bucket permissions and existence

4. **Message Broker Problems**
   - Verify RabbitMQ is running on port 5672
   - Check queue configuration and permissions

## Future Improvements

For detailed improvement proposals and implementation hints, see [Future Improvements](FUTURE_IMPROVEMENTS.md).


