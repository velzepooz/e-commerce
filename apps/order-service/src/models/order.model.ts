import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Order } from '../types/order.type';
import type { OrderStatus } from '../enums/order-status.enum';
import { OrderStatusEnum } from '../enums/order-status.enum';

const ORDER_COLLECTION_NAME = 'Orders';

export type OrderDocument = OrderModel & Document<string>;

@Schema({
  collection: ORDER_COLLECTION_NAME,
  timestamps: true,
  versionKey: false,
})
export class OrderModel extends Document<string> implements Order {
  @Prop({
    required: true,
    type: String,
    enum: OrderStatusEnum,
    default: OrderStatusEnum.CREATED,
  })
  status: OrderStatus;

  @Prop({ required: true })
  priceCents: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  sellerId: string;
}

export const OrderSchema = SchemaFactory.createForClass(OrderModel);
