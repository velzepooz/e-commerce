import { MongoBaseType } from '@app/shared';

export type OrderProjection = MongoBaseType & {
  orderId: string;
  status: string;
};
