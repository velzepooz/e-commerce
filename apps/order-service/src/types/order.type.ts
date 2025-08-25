import { MongoBaseType } from '@app/shared';
import { OrderStatus } from '../enums/order-status.enum';

export type Order = MongoBaseType & {
  status: OrderStatus;
  priceCents: number;
  quantity: number;
  productId: string;
  customerId: string;
  sellerId: string;
};

export type createOrderType = Omit<
  Order,
  '_id' | 'createdAt' | 'updatedAt' | 'status'
>;

export type ListOrdersQuery = {
  sellerId?: string;
  status?: OrderStatus;
  limit?: number;
  skip?: number;
};

export type OrderIdParam = {
  id: string;
};

export type UpdateOrderStatus = {
  status: OrderStatus;
};
