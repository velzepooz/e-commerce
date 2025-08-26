import { OrderStatus, OrderStatusEnum } from '@app/shared';
import { Faker } from '@app/shared';
import { TestingModule } from '@nestjs/testing';
import { OrderProjection } from '../../src/types/order-projection-repository.types';
import { OrderProjectionRepository } from '../../src/repositories/order-projection.repository';

type createOrderProjectionType = {
  onlyData?: boolean;
  orderId?: string;
  status?: OrderStatus;
};

export class OrderProjectionFactory {
  constructor(private readonly _module: TestingModule) {}

  async create({
    orderId = Faker.mongoId().toString(),
    status = OrderStatusEnum.CREATED,
    onlyData = false,
  }: createOrderProjectionType): Promise<OrderProjection> {
    if (onlyData) {
      return {
        _id: Faker.mongoId().toString(),
        orderId,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    const orderProjectionRepository = this._module.get(
      OrderProjectionRepository,
    );
    return await orderProjectionRepository.create({
      _id: Faker.mongoId().toString(),
      orderId,
      status,
    });
  }
}
