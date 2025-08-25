import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderRepository } from '../repository/order.repository';
import {
  Order,
  createOrderType,
  ListOrdersQuery,
  UpdateOrderStatus,
} from '../types/order.type';

@Injectable()
export class OrderServiceService {
  constructor(private readonly orderRepository: OrderRepository) { }

  async create(createOrder: createOrderType): Promise<Order> {
    return await this.orderRepository.create(createOrder);
  }

  async list(
    query: ListOrdersQuery,
  ): Promise<{ orders: Order[]; total: number }> {
    // TODO: implement business logic later
    const mockOrders: Order[] = [
      {
        _id: '507f1f77bcf86cd799439011',
        priceCents: 1999,
        quantity: 2,
        productId: '507f1f77bcf86cd799439012',
        customerId: '507f1f77bcf86cd799439013',
        sellerId: query.sellerId || '507f1f77bcf86cd799439014',
        status: query.status || 'CREATED',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z'),
      },
      {
        _id: '507f1f77bcf86cd799439015',
        priceCents: 2999,
        quantity: 1,
        productId: '507f1f77bcf86cd799439016',
        customerId: '507f1f77bcf86cd799439017',
        sellerId: query.sellerId || '507f1f77bcf86cd799439018',
        status: query.status || 'ACCEPTED',
        createdAt: new Date('2024-01-15T11:00:00.000Z'),
        updatedAt: new Date('2024-01-15T11:15:00.000Z'),
      },
    ];

    // Apply basic filtering for demonstration
    const filteredOrders = mockOrders.filter((order) => {
      if (query.sellerId && order.sellerId !== query.sellerId) return false;
      if (query.status && order.status !== query.status) return false;
      return true;
    });

    const skip = query.skip || 0;
    const limit = query.limit || 20;
    const paginatedOrders = filteredOrders.slice(skip, skip + limit);

    return Promise.resolve({
      orders: paginatedOrders,
      total: filteredOrders.length,
    });
  }

  async getById(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatus: UpdateOrderStatus,
  ): Promise<Order> {
    // TODO: implement business logic later
    const mockOrder: Order = {
      _id: id,
      priceCents: 1999,
      quantity: 2,
      productId: '507f1f77bcf86cd799439012',
      customerId: '507f1f77bcf86cd799439013',
      sellerId: '507f1f77bcf86cd799439014',
      status: updateOrderStatus.status,
      createdAt: new Date('2024-01-15T10:30:00.000Z'),
      updatedAt: new Date(),
    };
    return Promise.resolve(mockOrder);
  }
}
