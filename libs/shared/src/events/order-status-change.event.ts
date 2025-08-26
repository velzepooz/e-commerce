import { OrderStatus } from '../enums';

export type OrderStatusChangedEventPayload = {
  eventId: string;
  occurredAt: string;
  orderId: string;
  status: OrderStatus;
};
