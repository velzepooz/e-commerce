import { type OrderStatus } from '@app/shared';
import { Order } from './order-repository.types';

export type PaginatedOrders = {
  data: Order[];
  total: number;
};

export type createOrderType = Omit<
  Order,
  '_id' | 'createdAt' | 'updatedAt' | 'status'
> & {
  clientOrderId: string;
};

export type getListOrdersType = {
  sellerId?: string;
  customerId?: string;
  orderId?: string;
  status?: OrderStatus;
  limit?: number;
  skip?: number;
};

export type orderIdParamType = {
  id: string;
};

export type updateOrderStatusType = {
  status: OrderStatus;
};
