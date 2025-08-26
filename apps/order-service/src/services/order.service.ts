import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { OrderRepository } from '../repository/order.repository';
import {
  PaginatedOrders,
  createOrderType,
  getListOrdersType,
  updateOrderStatusType,
} from '../types/order-service.types';
import { type OrderStatus, OrderStatusEnum } from '@app/shared';
import { Order } from '../types/order-repository.types';
import { OrderStatusEventPublisherService } from './order-event-publisher.service';

@Injectable()
export class OrderServiceService {
  private readonly _logger = new Logger(OrderServiceService.name);

  private readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatusEnum.CREATED]: [
      OrderStatusEnum.ACCEPTED,
      OrderStatusEnum.REJECTED,
    ],
    [OrderStatusEnum.ACCEPTED]: [OrderStatusEnum.SHIPPING_IN_PROGRESS],
    [OrderStatusEnum.SHIPPING_IN_PROGRESS]: [OrderStatusEnum.SHIPPED],
    [OrderStatusEnum.REJECTED]: [],
    [OrderStatusEnum.SHIPPED]: [],
  };

  constructor(
    private readonly _orderRepository: OrderRepository,
    private readonly _orderEventPublisher: OrderStatusEventPublisherService,
  ) {}

  async create(
    createOrder: createOrderType,
  ): Promise<{ order: Order; created: boolean }> {
    const { sellerId, clientOrderId, customerId } = createOrder;

    const existingOrder = await this._orderRepository.findOne({
      sellerId,
      clientOrderId,
      customerId,
    });

    if (existingOrder) {
      this._logger.debug(
        `Order with sellerId ${sellerId}, clientOrderId ${clientOrderId}, customerId ${customerId} already exists`,
      );

      return { order: existingOrder, created: false };
    }

    try {
      const newOrder = await this._orderRepository.create(createOrder);
      this._logger.log(
        `New order created with sellerId ${sellerId}, clientOrderId ${clientOrderId}, orderId ${newOrder._id}`,
      );
      return { order: newOrder, created: true };
    } catch (error) {
      if (this._isDuplicateKeyError(error)) {
        this._logger.log(
          `Duplicate key error for sellerId ${sellerId}, clientOrderId ${clientOrderId} - fetching existing order`,
        );

        const existingOrder = await this._orderRepository.findOne({
          sellerId,
          clientOrderId,
          customerId,
        });

        if (existingOrder) {
          return { order: existingOrder, created: false };
        }

        this._logger.error(
          `Duplicate key error but no existing order found for sellerId ${sellerId}, clientOrderId ${clientOrderId}`,
        );
        throw new ConflictException(
          'Order creation failed due to concurrent modification',
        );
      }

      this._logger.error(
        `Order creation failed for sellerId ${sellerId}, clientOrderId ${clientOrderId}`,
        error,
      );
      throw error;
    }
  }

  async getById(id: string): Promise<Order> {
    const order = await this._orderRepository.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getOrdersList(query: getListOrdersType): Promise<PaginatedOrders> {
    return await this._orderRepository.findPaginated(query);
  }

  async updateStatus(
    id: string,
    updateOrderStatus: updateOrderStatusType,
  ): Promise<Order> {
    const { status: newStatus } = updateOrderStatus;

    const currentOrder = await this._orderRepository.findById(id);
    if (!currentOrder) {
      this._logger.warn(`Order update failed: Order ${id} not found`);
      throw new NotFoundException('Order not found');
    }

    const currentStatus = currentOrder.status;

    if (currentStatus === newStatus) {
      this._logger.debug(
        `Order ${id}: Idempotent update - status already ${currentStatus}`,
      );
      return currentOrder;
    }

    if (!this._isValidTransition(currentStatus, newStatus)) {
      this._logger.warn(
        `Order ${id}: Invalid transition from ${currentStatus} to ${newStatus}`,
      );
      throw new UnprocessableEntityException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    try {
      const updatedOrder = await this._orderRepository.findOneAndUpdate(
        {
          _id: id,
          status: currentStatus,
        },
        {
          status: newStatus,
        },
      );

      if (!updatedOrder) {
        this._logger.error(`Order ${id}: Update operation returned null`);
        throw new ConflictException(
          'Order update failed - order may have been modified',
        );
      }

      this._logger.log(
        `Order ${id}: Status successfully updated from ${currentStatus} to ${newStatus}`,
      );

      this._orderEventPublisher.emitOrderStatusChanged(id, newStatus);

      return updatedOrder;
    } catch (error) {
      this._logger.error(
        `Order ${id}: Database error during status update`,
        error,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Something went wrong');
    }
  }

  private _isValidTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const allowedTransitions = this.ALLOWED_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  private _isDuplicateKeyError(error: Error & { code?: number }): boolean {
    return (
      (typeof error?.code === 'number' && error.code === 11000) ||
      (typeof error?.message === 'string' &&
        error.message.includes('duplicate key'))
    );
  }
}
