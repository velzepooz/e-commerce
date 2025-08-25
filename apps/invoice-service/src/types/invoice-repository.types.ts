import { MongoBaseType } from '@app/shared';

export type Invoice = MongoBaseType & {
  orderId: string;
  url: string;
  sentAt: Date | null;
};
