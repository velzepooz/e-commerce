# Invoice Service

A microservice for managing invoice uploads, storage, and delivery in the e-commerce platform. This service handles PDF invoice file uploads, stores them in S3-compatible storage, and provides secure access through pre-signed URLs.

## 🏗️ Architecture

The Invoice Service is built with NestJS and follows a microservices architecture pattern:

- **Framework**: NestJS with Fastify adapter
- **Database**: MongoDB with Mongoose ORM (Repository pattern applied)
- **File Storage**: S3-compatible storage (AWS S3, MinIO, etc.)
- **Message Broker**: RabbitMQ for order status events
- **API Documentation**: Swagger/OpenAPI
- **File Handling**: PDF file uploads with validation

### Service Components

- **Invoice Management**: Upload, retrieve, and manage invoice files
- **Order Projection**: Maintain order status projections for business logic
- **Event Consumer**: Process order status change events from RabbitMQ
- **File Storage**: S3 integration for secure file storage
- **Health Monitoring**: Health check endpoints for monitoring

## 🚀 Features

### Core Functionality
- **PDF Invoice Upload**: Secure file upload with validation
- **Invoice Retrieval**: Get invoice details and metadata
- **Pre-signed URLs**: Generate secure, time-limited download links
- **Order Status Tracking**: Monitor order status changes
- **File Validation**: PDF file type and size validation
- **Duplicate Prevention**: Prevent multiple invoices per order

### API Endpoints
- `POST /invoices/upload` - Upload invoice PDF
- `GET /invoices` - List of invoices for order
- `GET /invoices/:id` - Get invoice by ID
- `GET /invoices/:id/url` - Generate download URL
- `GET /healthz` - Health check endpoint

### Event Processing
- Consumes order status change events from RabbitMQ
- Updates order projections
- Triggers invoice delivery workflows

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- RabbitMQ 3.8+
- S3-compatible storage (AWS S3, MinIO, etc.)
- pnpm package manager

### Development Commands

```bash
# Start development server with hot reload
make start-invoice

# Run tests
make test-invoice

# Build app
make build
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENV` | Environment name | `local` | Yes |
| `NODE_ENV` | Node environment | `development` | Yes |
| `PORT` | Server port | `3010` | Yes |
| `HOST` | Server host | `0.0.0.0` | Yes |
| `MONGO_URL` | MongoDB connection string | - | Yes |
| `DB_NAME` | MongoDB database name | `invoices` | Yes |
| `S3_ENDPOINT` | S3 endpoint URL | - | Yes |
| `S3_REGION` | S3 region | `us-east-1` | Yes |
| `S3_ACCESS_KEY_ID` | S3 access key | - | Yes |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | - | Yes |
| `INVOICE_BUCKET_NAME` | S3 bucket for invoices | `orders` | Yes |
| `S3_URL_TTL_SEC_DEFAULT` | Default URL expiration (seconds) | `300` | No |
| `RABBITMQ_URL` | RabbitMQ connection string | - | Yes |
| `RABBIT_PREFETCH` | RabbitMQ prefetch count | `50` | No |

### Configuration Files

- **Swagger Config** (`src/config/swagger.config.ts`): API documentation settings
- **Validation Pipe Config** (`src/config/validation-pipe.config.ts`): Request validation rules
- **Order Status Queue Config** (`src/config/order-status-queue.config.ts`): RabbitMQ configuration

## 🗄️ Data Models

### Invoice Model
```typescript
interface Invoice {
  _id: string;
  orderId: string;
  url: string;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Order Projection Model
```typescript
interface OrderProjection {
  _id: string;
  orderId: string;
  status: OrderStatusEnum;
  updatedAt: Date;
}
```

## 🔄 Event Flow

### Order Status Change Event
1. **Event Received**: RabbitMQ consumer receives order status change event
2. **Order Projection Update**: Updates local order status projection
3. **Invoice Processing**: Triggers invoice delivery workflow if applicable
4. **Logging**: Comprehensive logging for monitoring and debugging

### Invoice Upload Flow
1. **File Validation**: PDF file type and size validation
2. **Duplicate Check**: Ensures only one invoice per order
3. **S3 Upload**: Stores file in S3 with organized key structure
4. **Database Record**: Creates invoice record in MongoDB
5. **Delivery Trigger**: Attempts to mark invoice as sent

## 🧪 Testing

### Test Structure
- **Unit Tests**: Located in `src/services/__test__/`
- **E2E Tests**: Located in `test/` directory
- **Test Factories**: Located in `test/factories/`

### Running Tests
```bash
# All tests
make test-invoice
```

## 🚀 Deployment

### Production Build
```bash
# Build the service
pnpm build

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

- **File Validation**: PDF file type and size restrictions
- **Pre-signed URLs**: Time-limited, secure file access
- **Input Validation**: Request payload validation using DTOs
- **Error Handling**: Secure error messages without information leakage

### Internal Libraries
- **@app/shared**: Common utilities, DTOs, and enums
- **@app/s3**: S3 service integration

## 📚 API Documentation

Once the service is running, access the Swagger documentation at:
```
http://localhost:3010/invoices/docs
```

The API documentation includes:
- Request/response schemas
- Example payloads
- Error codes and descriptions
- Interactive testing interface
