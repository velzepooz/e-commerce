import { MongoBaseType } from '@app/shared';
import { OrderStatus } from '../enums/order-status.enum';

export type Order = MongoBaseType & {
  status: OrderStatus;
  priceCents: number;
  quantity: number;
  productId: string;
  customerId: string;
  sellerId: string;
  clientOrderId: string;
};

export type findBySellerClientOrderIdAndCustomerIdType = {
  sellerId: string;
  clientOrderId: string;
  customerId: string;
};
