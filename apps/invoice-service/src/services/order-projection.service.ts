import { Injectable, Logger } from '@nestjs/common';
import { OrderProjectionRepository } from '../repositories/order-projection.repository';
import { OrderStatus, OrderStatusEnum } from '@app/shared';
import { OrderProjection } from '../types/order-projection-repository.types';

@Injectable()
export class OrderProjectionService {
  private readonly _logger = new Logger(OrderProjectionService.name);
  private readonly ORDER_STATUS_RANKS: Record<OrderStatus, number> = {
    [OrderStatusEnum.CREATED]: 0,
    [OrderStatusEnum.ACCEPTED]: 1,
    [OrderStatusEnum.SHIPPING_IN_PROGRESS]: 2,
    [OrderStatusEnum.SHIPPED]: 3,
    [OrderStatusEnum.REJECTED]: 4,
  };

  constructor(
    private readonly _orderProjectionRepository: OrderProjectionRepository,
  ) {}

  async getByOrderId(orderId: string): Promise<OrderProjection | null> {
    return this._orderProjectionRepository.findOne({ orderId });
  }

  async createOrUpdate(orderId: string, newStatus: OrderStatus): Promise<void> {
    const existingProjection = await this._orderProjectionRepository.findOne({
      orderId,
    });

    if (!existingProjection) {
      await this._orderProjectionRepository.create({
        orderId,
        status: newStatus,
      });
      this._logger.log('Created new order projection', {
        orderId,
        status: newStatus,
      });
      return;
    }

    const existingRank =
      this.ORDER_STATUS_RANKS[existingProjection.status as OrderStatus] ?? -1;
    const newRank = this.ORDER_STATUS_RANKS[newStatus];

    if (newRank >= existingRank) {
      await this._orderProjectionRepository.findOneAndUpdate(
        { orderId },
        { orderId, status: newStatus },
      );
      this._logger.log('Updated order projection with higher rank status', {
        orderId,
        oldStatus: existingProjection.status,
        newStatus,
        oldRank: existingRank,
        newRank,
      });
    } else {
      this._logger.log('Ignored lower rank status update', {
        orderId,
        existingStatus: existingProjection.status,
        incomingStatus: newStatus,
        existingRank,
        incomingRank: newRank,
      });
    }
  }
}
