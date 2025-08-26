import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OrderProjectionModel,
  OrderProjectionDocument,
} from '../models/order-projection.model';
import { MongoBaseRepository } from '@app/shared';

@Injectable()
export class OrderProjectionRepository extends MongoBaseRepository<OrderProjectionModel> {
  constructor(
    @InjectModel(OrderProjectionModel.name)
    _model: Model<OrderProjectionDocument>,
  ) {
    super(_model);
  }
}
