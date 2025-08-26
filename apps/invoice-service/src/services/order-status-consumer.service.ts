import { Injectable, Logger } from '@nestjs/common';
import { OrderStatusChangedEventPayload } from '@app/shared';
import { InvoiceService } from './invoice.service';
import { OrderProjectionService } from './order-projection.service';

@Injectable()
export class OrderStatusConsumerService {
  private readonly _logger = new Logger(OrderStatusConsumerService.name);

  constructor(
    private readonly _invoiceService: InvoiceService,
    private readonly _orderProjectionService: OrderProjectionService,
  ) {}

  async handleOrderStatusChanged(
    payload: OrderStatusChangedEventPayload,
  ): Promise<void> {
    const { eventId, orderId, status } = payload;

    try {
      this._logger.log('Processing order status change event', {
        eventId,
        orderId,
        status,
      });

      await this._orderProjectionService.createOrUpdate(orderId, status);

      await this._invoiceService.tryMarkInvoiceAsSent(orderId);

      this._logger.log('Successfully processed order status change event', {
        eventId,
        orderId,
        status,
      });
    } catch (error) {
      this._logger.error('Failed to process order status change event', {
        eventId,
        orderId,
        status,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
}
