import {
  Injectable,
  Logger,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  type OrderStatusChangedEventPayload,
  type OrderStatus,
  OrderStatusEventsEnum,
} from '@app/shared';
import { randomUUID } from 'node:crypto';

export const ORDER_EVENT_PUBLISHER_CLIENT = 'ORDER_EVENT_PUBLISHER_CLIENT';

@Injectable()
export class OrderStatusEventPublisherService {
  private readonly _logger = new Logger(OrderStatusEventPublisherService.name);

  constructor(
    @Inject(ORDER_EVENT_PUBLISHER_CLIENT) private readonly _client: ClientProxy,
  ) {}

  emitOrderStatusChanged(orderId: string, status: OrderStatus): void {
    const event: OrderStatusChangedEventPayload = {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      orderId,
      status,
    };

    try {
      this._client.emit(OrderStatusEventsEnum.ORDER_STATUS_CHANGED, event);

      this._logger.log('Order status changed event emitted', {
        eventId: event.eventId,
        orderId,
        status,
      });
    } catch (error) {
      this._logger.error('Failed to emit order status changed event', {
        eventId: event.eventId,
        orderId,
        status,
        error: error.message,
        stack: error.stack,
      });

      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
