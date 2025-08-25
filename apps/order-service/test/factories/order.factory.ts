import {
  OrderStatus,
  OrderStatusEnum,
} from '../../src/enums/order-status.enum';
import { Faker } from '../../../../libs/shared/src/test/faker.util';
import { TestingModule } from '@nestjs/testing';
import { OrderRepository } from '../../src/repository/order.repository';
import { Order } from '../../src/types/order.type';

export type createOrderType = {
  priceCents?: number;
  quantity?: number;
  productId?: string;
  customerId?: string;
  sellerId?: string;
  status?: OrderStatus;
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
      status,
    });
    return order;
  }
}
