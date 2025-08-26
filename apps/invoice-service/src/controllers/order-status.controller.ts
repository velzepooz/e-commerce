import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrderStatusConsumerService } from '../services/order-status-consumer.service';
import {
  type OrderStatusChangedEventPayload,
  OrderStatusEventsEnum,
} from '@app/shared';

@UsePipes(new ValidationPipe())
@Controller()
export class OrderStatusConsumerController {
  constructor(
    private readonly _orderStatusConsumerService: OrderStatusConsumerService,
  ) {}

  @EventPattern(OrderStatusEventsEnum.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged(
    @Payload() payload: OrderStatusChangedEventPayload,
  ): Promise<void> {
    await this._orderStatusConsumerService.handleOrderStatusChanged(payload);
  }
}
