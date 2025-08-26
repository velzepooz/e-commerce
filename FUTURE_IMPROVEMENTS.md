# Future Improvements

This document provides improvement proposal and implementation hints.

## Improvements

### Security & Access Control

#### Authentication & Authorization
- Add JWT-based auth with role claims
- **Example**: seller can upload invoices, customer can only view their own orders

#### RBAC
Fine-grained rules:
- `customer` can read only their orders
- `seller` can manage only their own orders/invoices

#### API Rate Limiting
- Use NestJS `@nestjs/throttler` or Redis-based rate limiting for invoice downloads

#### File Security
- Virus scanning on upload
- Store file hashes (SHA256) to detect tampering

#### Public Download Host
- Instead of exposing raw MinIO URLs, proxy downloads via a public service that checks auth + TTL

### Data Model Optimization

#### Indexes
- **Orders**: `(sellerId, status, createdAt)` for dashboards
- **Invoices**: `(sentAt, createdAt)` for reporting

#### Orders versioning
- Add `version` field to orders
- Prevents race conditions on concurrent updates

#### Event Sourcing
- Store all order events (Created, Accepted, ...) for audit
- Rebuild order state from event log if needed

### Reliability & Event Processing

#### Dead Letter Queues (DLQ)
- Configure RabbitMQ DLQs per consumer queue
- If a message repeatedly fails, it is routed to a DLQ for manual inspection

#### Event Deduplication
- Add `ProcessedEvent { eventId, processedAt }` collection to ensure idempotency across redeploys
- Consumers check eventId before applying side effects

#### Transactional Outbox or CDC pattern
- **Pattern**: Write events to an "outbox" table inside the same transaction as the order update
- A background worker publishes them to RabbitMQ and marks them sent
- Ensures atomicity and no lost events
- **Tooling**: nestjs-outbox, custom outbox worker, or Debezium for CDC
