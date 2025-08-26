import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderProjection } from '../types/order-projection-repository.types';

const ORDER_PROJECTION_COLLECTION_NAME = 'OrderProjections';

export type OrderProjectionDocument = OrderProjectionModel & Document<string>;

@Schema({
  collection: ORDER_PROJECTION_COLLECTION_NAME,
  timestamps: true,
  versionKey: false,
})
export class OrderProjectionModel
  extends Document<string>
  implements OrderProjection
{
  @Prop({ required: true, unique: true, index: true })
  orderId: string;

  @Prop({ required: true })
  status: string;
}

export const OrderProjectionSchema =
  SchemaFactory.createForClass(OrderProjectionModel);
