export const OrderStatusEnum = {
  CREATED: 'CREATED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  SHIPPING_IN_PROGRESS: 'SHIPPING_IN_PROGRESS',
  SHIPPED: 'SHIPPED',
} as const;

export type OrderStatus =
  (typeof OrderStatusEnum)[keyof typeof OrderStatusEnum];
