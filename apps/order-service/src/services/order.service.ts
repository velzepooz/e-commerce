import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { OrderRepository } from '../repository/order.repository';
import {
  PaginatedOrders,
  createOrderType,
  getListOrdersType,
  updateOrderStatusType,
} from '../types/order-service.types';
import { OrderStatus, OrderStatusEnum } from '../enums/order-status.enum';
import { Order } from '../types/order-repository.types';

@Injectable()
export class OrderServiceService {
  private readonly logger = new Logger(OrderServiceService.name);

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

  constructor(private readonly orderRepository: OrderRepository) { }

  async create(
    createOrder: createOrderType,
  ): Promise<{ order: Order; created: boolean }> {
    const { sellerId, clientOrderId, customerId } = createOrder;

    const existingOrder = await this.orderRepository.findOne({
      sellerId,
      clientOrderId,
      customerId,
    });

    if (existingOrder) {
      this.logger.log(
        `Order with sellerId ${sellerId}, clientOrderId ${clientOrderId}, customerId ${customerId} already exists`,
      );

      return { order: existingOrder, created: false };
    }

    try {
      const newOrder = await this.orderRepository.create(createOrder);
      this.logger.log(
        `New order created with sellerId ${sellerId}, clientOrderId ${clientOrderId}, orderId ${newOrder._id}`,
      );
      return { order: newOrder, created: true };
    } catch (error) {
      if (this._isDuplicateKeyError(error)) {
        this.logger.log(
          `Duplicate key error for sellerId ${sellerId}, clientOrderId ${clientOrderId} - fetching existing order`,
        );

        const existingOrder = await this.orderRepository.findOne({
          sellerId,
          clientOrderId,
          customerId,
        });

        if (existingOrder) {
          return { order: existingOrder, created: false };
        }

        this.logger.error(
          `Duplicate key error but no existing order found for sellerId ${sellerId}, clientOrderId ${clientOrderId}`,
        );
        throw new ConflictException(
          'Order creation failed due to concurrent modification',
        );
      }

      this.logger.error(
        `Order creation failed for sellerId ${sellerId}, clientOrderId ${clientOrderId}`,
        error,
      );
      throw error;
    }
  }

  async getById(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getListOrders(query: getListOrdersType): Promise<PaginatedOrders> {
    return await this.orderRepository.findPaginated(query);
  }

  async updateStatus(
    id: string,
    updateOrderStatus: updateOrderStatusType,
  ): Promise<Order> {
    const { status: newStatus } = updateOrderStatus;

    const currentOrder = await this.orderRepository.findById(id);
    if (!currentOrder) {
      this.logger.warn(`Order update failed: Order ${id} not found`);
      throw new NotFoundException('Order not found');
    }

    const currentStatus = currentOrder.status;

    if (currentStatus === newStatus) {
      this.logger.log(
        `Order ${id}: Idempotent update - status already ${currentStatus}`,
      );
      return currentOrder;
    }

    if (!this._isValidTransition(currentStatus, newStatus)) {
      this.logger.warn(
        `Order ${id}: Invalid transition from ${currentStatus} to ${newStatus}`,
      );
      throw new UnprocessableEntityException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    try {
      const updatedOrder = await this.orderRepository.findOneAndUpdate(
        {
          _id: id,
          status: currentStatus,
        },
        {
          status: newStatus,
        },
      );

      if (!updatedOrder) {
        this.logger.error(`Order ${id}: Update operation returned null`);
        throw new ConflictException(
          'Order update failed - order may have been modified',
        );
      }

      this.logger.log(
        `Order ${id}: Status successfully updated from ${currentStatus} to ${newStatus}`,
      );

      return updatedOrder;
    } catch (error) {
      this.logger.error(
        `Order ${id}: Database error during status update`,
        error,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException('Order update failed due to database error');
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
