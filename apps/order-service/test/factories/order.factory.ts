import {
  OrderStatus,
  OrderStatusEnum,
} from '../../../../libs/shared/src/enums/order-status.enum';
import { Faker } from '@app/shared';
import { TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../src/repository/order.repository';
import { Order } from '../../src/types/order-repository.types';

export type createOrderType = {
  priceCents?: number;
  quantity?: number;
  productId?: string;
  customerId?: string;
  sellerId?: string;
  clientOrderId?: string;
  status?: OrderStatus;
  // If true, only return mock data without saving to database
  onlyData?: boolean;
};

export class OrderFactory {
  constructor(private readonly _moduleRef: TestingModule) {}

  async create({
    priceCents = Faker.integer({ min: 100, max: 1000 }),
    quantity = Faker.integer({ min: 1, max: 10 }),
    productId = Faker.mongoId().toString(),
    customerId = Faker.mongoId().toString(),
    sellerId = Faker.mongoId().toString(),
    clientOrderId = Faker.uid(),
    status = OrderStatusEnum.CREATED,
    onlyData = false,
  }: createOrderType): Promise<Order> {
    if (onlyData) {
      return {
        priceCents,
        quantity,
        productId,
        customerId,
        sellerId,
        clientOrderId,
        status,
        _id: Faker.mongoId().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const modelRef = this._moduleRef.get<OrderRepository>(OrderRepository);
    const order = await modelRef.create({
      priceCents,
      quantity,
      productId,
      customerId,
      sellerId,
      clientOrderId,
      status,
    });
    return order;
  }
}
