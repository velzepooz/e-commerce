import { MongoBaseRepository } from '@app/shared';
import { OrderDocument, OrderModel } from '../models/order.model';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
// import { Order } from '../types/order.type';

@Injectable()
export class OrderRepository extends MongoBaseRepository<OrderModel> {
  constructor(
    @InjectModel(OrderModel.name)
    model: Model<OrderDocument>,
  ) {
    super(model);
  }
}
