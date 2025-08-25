import { MongoBaseRepository } from '@app/shared';
import { OrderDocument, OrderModel } from '../models/order.model';
import { Model, FilterQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import {
  getListOrdersType,
  PaginatedOrders,
} from '../types/order-service.types';

@Injectable()
export class OrderRepository extends MongoBaseRepository<OrderModel> {
  constructor(
    @InjectModel(OrderModel.name)
    _model: Model<OrderDocument>,
  ) {
    super(_model);
  }

  async findPaginated(query: getListOrdersType): Promise<PaginatedOrders> {
    const filter: FilterQuery<OrderModel> = {};

    if (query.sellerId) {
      filter.sellerId = query.sellerId;
    }

    if (query.customerId) {
      filter.customerId = query.customerId;
    }

    if (query.orderId) {
      filter._id = query.orderId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const skip = query.skip || 0;
    const limit = Math.min(query.limit || 20, 100);

    const [orders, total] = await Promise.all([
      this._model
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean<OrderModel[]>(),
      this._model.countDocuments(filter),
    ]);

    return {
      data: orders,
      total,
    };
  }
}
