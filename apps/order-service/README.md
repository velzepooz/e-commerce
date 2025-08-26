# Order Service

A microservice for managing orders in the e-commerce platform. This service handles order creation, status management, and publishes order status change events to other services through RabbitMQ.

## 🏗️ Architecture

The Order Service is built with NestJS and follows a microservices architecture pattern:

- **Framework**: NestJS with Fastify adapter
- **Database**: MongoDB with Mongoose ORM (Repository pattern applied)
- **Message Broker**: RabbitMQ for order status events
- **API Documentation**: Swagger/OpenAPI
- **Event Publishing**: Order status change event notifications

### Service Components

- **Order Management**: Create, retrieve, and manage orders
- **Status Management**: Handle order status transitions with business rules
- **Event Publishing**: Emit order status change events to RabbitMQ
- **Idempotent Operations**: Prevent duplicate order creation
- **Health Monitoring**: Health check endpoints for monitoring

## 🚀 Features

### Core Functionality
- **Order Creation**: Idempotent order creation with validation
- **Order Retrieval**: Get order details and list orders with pagination
- **Status Management**: Update order status with transition validation
- **Event Publishing**: Notify other services of status changes
- **Duplicate Prevention**: Unique constraint on sellerId + clientOrderId + customerId
- **Business Rules**: Enforce valid status transitions

### API Endpoints
- `POST /orders` - Create new order (idempotent)
- `GET /orders/:id` - Get order by ID
- `PATCH /orders/:id/status` - Update order status
- `GET /orders` - List orders with pagination and filters
- `GET /healthz` - Health check endpoint

### Event Publishing
- Publishes `orders.statusChanged` events to RabbitMQ
- Includes event metadata (eventId, occurredAt, orderId, status)
- Ensures reliable event delivery for downstream services

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- RabbitMQ 3.8+
- pnpm package manager

### Development Commands

```bash
# Start development server with hot reload
make start-order

# Run tests
make test-order

# Build app
make build
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENV` | Environment name | `local` | Yes |
| `NODE_ENV` | Node environment | `development` | Yes |
| `PORT` | Server port | `3000` | Yes |
| `HOST` | Server host | `0.0.0.0` | Yes |
| `MONGO_URL` | MongoDB connection string | - | Yes |
| `DB_NAME` | MongoDB database name | `orders` | Yes |
| `RABBITMQ_URL` | RabbitMQ connection string | - | Yes |

### Configuration Files

- **Swagger Config** (`src/config/swagger.config.ts`): API documentation settings
- **Validation Pipe Config** (`src/config/validation-pipe.config.ts`): Request validation rules
- **Order Status Queue Config** (`src/config/order-status-queue.config.ts`): RabbitMQ configuration

## 🗄️ Data Models

### Order Model
```typescript
interface Order {
  _id: string;
  status: OrderStatus;
  priceCents: number;
  quantity: number;
  productId: string;
  customerId: string;
  sellerId: string;
  clientOrderId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Order Status Enum
```typescript
enum OrderStatus {
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  SHIPPING_IN_PROGRESS = 'SHIPPING_IN_PROGRESS',
  SHIPPED = 'SHIPPED'
}
```

## 🔄 Business Logic

### Status Transition Rules
The service enforces strict status transition rules:

- **CREATED** → **ACCEPTED** or **REJECTED**
- **ACCEPTED** → **SHIPPING_IN_PROGRESS**
- **SHIPPING_IN_PROGRESS** → **SHIPPED**
- **REJECTED** → No further transitions
- **SHIPPED** → No further transitions

### Idempotent Order Creation
- Orders are uniquely identified by `sellerId + clientOrderId + customerId`
- Duplicate creation requests return the existing order
- Prevents accidental duplicate orders in concurrent scenarios

## 🧪 Testing

### Test Structure
- **Unit Tests**: Located in `src/services/__tests__/`
- **E2E Tests**: Located in `test/` directory
- **Test Factories**: Located in `test/factories/`

### Running Tests
```bash
# All tests
make test-order
```

## 🚀 Deployment

### Production Build
```bash
# Build the service
make build

# Start production server
pnpm start:prod
```

### Environment-Specific Configs
- **Local Development**: Uses `.env` file
- **Production**: Use environment variables or secrets management
- **Testing**: Uses `.test.env` for test-specific configuration

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /healthz` - Basic health check

## 🔒 Security Features

- **Input Validation**: Request payload validation using DTOs
- **Business Rule Enforcement**: Status transition validation
- **Error Handling**: Secure error messages without information leakage
- **Idempotent Operations**: Prevents duplicate resource creation

## 🤝 Integration Points

### External Services
- **MongoDB**: Data persistence
- **RabbitMQ**: Event publishing

### Internal Libraries
- **@app/shared**: Common utilities, DTOs, and enums

## 📚 API Documentation

Once the service is running, access the Swagger documentation at:
```
http://localhost:3000/orders/docs
```

The API documentation includes:
- Request/response schemas
- Example payloads
- Error codes and descriptions
- Interactive testing interface

## 🔄 Event Flow

### Order Status Change Event
1. **Status Update**: Order status is updated via API
2. **Validation**: Business rules validate the status transition
3. **Event Publishing**: `orders.statusChanged` event is published to RabbitMQ
4. **Logging**: Comprehensive logging for monitoring and debugging

### Order Creation Flow
1. **Input Validation**: Request payload validation using DTOs
2. **Duplicate Check**: Ensures unique order based on business keys
3. **Database Record**: Creates order record in MongoDB
4. **Response**: Returns order details with creation status
