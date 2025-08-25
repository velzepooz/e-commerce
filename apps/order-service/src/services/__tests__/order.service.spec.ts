import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { OrderServiceService } from '../order.service';
import { OrderRepository } from '../../repository/order.repository';
import { OrderStatusEnum } from '../../enums/order-status.enum';
import { OrderFactory } from '../../../test/factories/order.factory';
import { OrderModel } from '../../models/order.model';
import { Order } from '../../types/order-repository.types';
import { Faker } from '@app/shared';

describe('OrderServiceService', () => {
  let orderService: OrderServiceService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let orderFactory: OrderFactory;
  let mockOrder: OrderModel;

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findPaginated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderServiceService,
        {
          provide: OrderRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    orderFactory = new OrderFactory(module);
    mockOrder = (await orderFactory.create({
      status: OrderStatusEnum.CREATED,
      onlyData: true,
    })) as OrderModel;

    orderService = module.get<OrderServiceService>(OrderServiceService);
    orderRepository = module.get<OrderRepository>(
      OrderRepository,
    ) as jest.Mocked<OrderRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('On updateStatus', () => {
    it('Should successfully update status from CREATED to ACCEPTED', async () => {
      const orderId = mockOrder._id;
      const updatedOrder = { ...mockOrder, status: OrderStatusEnum.ACCEPTED };

      orderRepository.findById.mockResolvedValue(mockOrder);
      orderRepository.findOneAndUpdate.mockResolvedValue(
        updatedOrder as OrderModel,
      );

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.ACCEPTED,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.CREATED },
        { status: OrderStatusEnum.ACCEPTED },
      );
      expect(result).toEqual(updatedOrder);
    });

    it('Should successfully update status from CREATED to REJECTED', async () => {
      const orderId = mockOrder._id;
      const updatedOrder = { ...mockOrder, status: OrderStatusEnum.REJECTED };

      orderRepository.findById.mockResolvedValue(mockOrder);
      orderRepository.findOneAndUpdate.mockResolvedValue(
        updatedOrder as OrderModel,
      );

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.REJECTED,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.CREATED },
        { status: OrderStatusEnum.REJECTED },
      );
      expect(result).toEqual(updatedOrder);
    });

    it('Should successfully update status from ACCEPTED to SHIPPING_IN_PROGRESS', async () => {
      const orderId = mockOrder._id;
      const orderInAcceptedState = {
        ...mockOrder,
        status: OrderStatusEnum.ACCEPTED,
      } as OrderModel;
      const updatedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.SHIPPING_IN_PROGRESS,
      } as OrderModel;

      orderRepository.findById.mockResolvedValue(orderInAcceptedState);
      orderRepository.findOneAndUpdate.mockResolvedValue(updatedOrder);

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.SHIPPING_IN_PROGRESS,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.ACCEPTED },
        { status: OrderStatusEnum.SHIPPING_IN_PROGRESS },
      );
      expect(result).toEqual(updatedOrder);
    });

    it('Should successfully update status from SHIPPING_IN_PROGRESS to SHIPPED', async () => {
      const orderId = mockOrder._id;
      const orderInShippingState = {
        ...mockOrder,
        status: OrderStatusEnum.SHIPPING_IN_PROGRESS,
      } as OrderModel;
      const updatedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.SHIPPED,
      } as OrderModel;

      orderRepository.findById.mockResolvedValue(orderInShippingState);
      orderRepository.findOneAndUpdate.mockResolvedValue(updatedOrder);

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.SHIPPED,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.SHIPPING_IN_PROGRESS },
        { status: OrderStatusEnum.SHIPPED },
      );
      expect(result).toEqual(updatedOrder);
    });

    it('Should throw NotFoundException when order does not exist', async () => {
      const orderId = 'non-existent-id';
      orderRepository.findById.mockResolvedValue(null);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.ACCEPTED,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should return unchanged order when status is already the requested status (CREATED)', async () => {
      const orderId = mockOrder._id;
      orderRepository.findById.mockResolvedValue(mockOrder);

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.CREATED,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it('Should return unchanged order when status is already REJECTED', async () => {
      const orderId = mockOrder._id;
      const rejectedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.REJECTED,
      } as OrderModel;
      orderRepository.findById.mockResolvedValue(rejectedOrder);

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.REJECTED,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(rejectedOrder);
    });

    it('Should return unchanged order when status is already SHIPPED', async () => {
      const orderId = mockOrder._id;
      const shippedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.SHIPPED,
      } as OrderModel;
      orderRepository.findById.mockResolvedValue(shippedOrder);

      const result = await orderService.updateStatus(orderId, {
        status: OrderStatusEnum.SHIPPED,
      });

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(shippedOrder);
    });

    it('Should throw UnprocessableEntityException when trying to go from CREATED to SHIPPING_IN_PROGRESS', async () => {
      const orderId = mockOrder._id;
      orderRepository.findById.mockResolvedValue(mockOrder);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.SHIPPING_IN_PROGRESS,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should throw UnprocessableEntityException when trying to go from CREATED to SHIPPED', async () => {
      const orderId = mockOrder._id;
      orderRepository.findById.mockResolvedValue(mockOrder);

      await expect(
        orderService.updateStatus(orderId, { status: OrderStatusEnum.SHIPPED }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should throw UnprocessableEntityException when trying to transition from terminal state REJECTED', async () => {
      const orderId = mockOrder._id;
      const rejectedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.REJECTED,
      } as OrderModel;
      orderRepository.findById.mockResolvedValue(rejectedOrder);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.ACCEPTED,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should throw UnprocessableEntityException when trying to transition from terminal state SHIPPED', async () => {
      const orderId = mockOrder._id;
      const shippedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.SHIPPED,
      } as OrderModel;
      orderRepository.findById.mockResolvedValue(shippedOrder);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.ACCEPTED,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should throw UnprocessableEntityException when trying to go backwards from ACCEPTED to CREATED', async () => {
      const orderId = mockOrder._id;
      const acceptedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.ACCEPTED,
      } as OrderModel;
      orderRepository.findById.mockResolvedValue(acceptedOrder);

      await expect(
        orderService.updateStatus(orderId, { status: OrderStatusEnum.CREATED }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should throw UnprocessableEntityException when trying to skip states from ACCEPTED to SHIPPED', async () => {
      const orderId = mockOrder._id;
      const acceptedOrder = {
        ...mockOrder,
        status: OrderStatusEnum.ACCEPTED,
      } as OrderModel;
      orderRepository.findById.mockResolvedValue(acceptedOrder);

      await expect(
        orderService.updateStatus(orderId, { status: OrderStatusEnum.SHIPPED }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should throw ConflictException when repository update returns null', async () => {
      const orderId = mockOrder._id;
      orderRepository.findById.mockResolvedValue(mockOrder);
      orderRepository.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.ACCEPTED,
        }),
      ).rejects.toThrow(ConflictException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.CREATED },
        { status: OrderStatusEnum.ACCEPTED },
      );
    });

    it('Should re-throw ConflictException when repository throws ConflictException', async () => {
      const orderId = mockOrder._id;
      const conflictError = new ConflictException('Version mismatch');

      orderRepository.findById.mockResolvedValue(mockOrder);
      orderRepository.findOneAndUpdate.mockRejectedValue(conflictError);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.ACCEPTED,
        }),
      ).rejects.toThrow(ConflictException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.CREATED },
        { status: OrderStatusEnum.ACCEPTED },
      );
    });

    it('Should throw ConflictException for general database errors', async () => {
      const orderId = mockOrder._id;
      const dbError = new Error('Database connection failed');

      orderRepository.findById.mockResolvedValue(mockOrder);
      orderRepository.findOneAndUpdate.mockRejectedValue(dbError);

      await expect(
        orderService.updateStatus(orderId, {
          status: OrderStatusEnum.ACCEPTED,
        }),
      ).rejects.toThrow(ConflictException);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(orderRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatusEnum.CREATED },
        { status: OrderStatusEnum.ACCEPTED },
      );
    });

    describe('Valid transitions', () => {
      const validTransitions = [
        {
          from: OrderStatusEnum.CREATED,
          to: OrderStatusEnum.ACCEPTED,
          description: 'CREATED to ACCEPTED',
        },
        {
          from: OrderStatusEnum.CREATED,
          to: OrderStatusEnum.REJECTED,
          description: 'CREATED to REJECTED',
        },
        {
          from: OrderStatusEnum.ACCEPTED,
          to: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          description: 'ACCEPTED to SHIPPING_IN_PROGRESS',
        },
        {
          from: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          to: OrderStatusEnum.SHIPPED,
          description: 'SHIPPING_IN_PROGRESS to SHIPPED',
        },
      ];

      it.each(validTransitions)(
        'Should allow transition from $description',
        async ({ from, to }) => {
          const orderId = mockOrder._id;
          const currentOrder = {
            ...mockOrder,
            status: from,
          } as OrderModel;
          const updatedOrder = {
            ...mockOrder,
            status: to,
          } as OrderModel;

          orderRepository.findById.mockResolvedValue(currentOrder);
          orderRepository.findOneAndUpdate.mockResolvedValue(updatedOrder);

          const result = await orderService.updateStatus(orderId, {
            status: to,
          });

          expect(result.status).toBe(to);
        },
      );
    });

    describe('Invalid transitions', () => {
      const invalidTransitions = [
        // From CREATED - skipping states
        {
          from: OrderStatusEnum.CREATED,
          to: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          description: 'CREATED to SHIPPING_IN_PROGRESS (skipping ACCEPTED)',
        },
        {
          from: OrderStatusEnum.CREATED,
          to: OrderStatusEnum.SHIPPED,
          description: 'CREATED to SHIPPED (skipping intermediate states)',
        },
        // From ACCEPTED - backwards or skipping
        {
          from: OrderStatusEnum.ACCEPTED,
          to: OrderStatusEnum.CREATED,
          description: 'ACCEPTED to CREATED (backwards)',
        },
        {
          from: OrderStatusEnum.ACCEPTED,
          to: OrderStatusEnum.REJECTED,
          description: 'ACCEPTED to REJECTED (invalid after acceptance)',
        },
        {
          from: OrderStatusEnum.ACCEPTED,
          to: OrderStatusEnum.SHIPPED,
          description: 'ACCEPTED to SHIPPED (skipping SHIPPING_IN_PROGRESS)',
        },
        // From SHIPPING_IN_PROGRESS - backwards
        {
          from: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          to: OrderStatusEnum.CREATED,
          description: 'SHIPPING_IN_PROGRESS to CREATED (backwards)',
        },
        {
          from: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          to: OrderStatusEnum.ACCEPTED,
          description: 'SHIPPING_IN_PROGRESS to ACCEPTED (backwards)',
        },
        {
          from: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          to: OrderStatusEnum.REJECTED,
          description: 'SHIPPING_IN_PROGRESS to REJECTED (backwards)',
        },
        // From terminal states - any transition
        {
          from: OrderStatusEnum.REJECTED,
          to: OrderStatusEnum.CREATED,
          description: 'REJECTED to CREATED (from terminal state)',
        },
        {
          from: OrderStatusEnum.REJECTED,
          to: OrderStatusEnum.ACCEPTED,
          description: 'REJECTED to ACCEPTED (from terminal state)',
        },
        {
          from: OrderStatusEnum.REJECTED,
          to: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          description: 'REJECTED to SHIPPING_IN_PROGRESS (from terminal state)',
        },
        {
          from: OrderStatusEnum.REJECTED,
          to: OrderStatusEnum.SHIPPED,
          description: 'REJECTED to SHIPPED (from terminal state)',
        },
        {
          from: OrderStatusEnum.SHIPPED,
          to: OrderStatusEnum.CREATED,
          description: 'SHIPPED to CREATED (from terminal state)',
        },
        {
          from: OrderStatusEnum.SHIPPED,
          to: OrderStatusEnum.ACCEPTED,
          description: 'SHIPPED to ACCEPTED (from terminal state)',
        },
        {
          from: OrderStatusEnum.SHIPPED,
          to: OrderStatusEnum.REJECTED,
          description: 'SHIPPED to REJECTED (from terminal state)',
        },
        {
          from: OrderStatusEnum.SHIPPED,
          to: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          description: 'SHIPPED to SHIPPING_IN_PROGRESS (from terminal state)',
        },
      ];

      it.each(invalidTransitions)(
        'Should reject transition: $description',
        async ({ from, to }) => {
          const orderId = mockOrder._id;
          const currentOrder = {
            ...mockOrder,
            status: from,
          } as OrderModel;

          orderRepository.findById.mockResolvedValue(currentOrder);

          await expect(
            orderService.updateStatus(orderId, { status: to }),
          ).rejects.toThrow(UnprocessableEntityException);

          expect(orderRepository.findOneAndUpdate).not.toHaveBeenCalled();
        },
      );
    });
  });

  describe('On create', () => {
    let mockOrder: Order;
    let createOrderData: any;

    beforeAll(async () => {
      mockOrder = await orderFactory.create({
        status: OrderStatusEnum.CREATED,
        onlyData: true,
      });
    });

    beforeEach(() => {
      createOrderData = {
        priceCents: mockOrder.priceCents,
        quantity: mockOrder.quantity,
        productId: mockOrder.productId,
        customerId: mockOrder.customerId,
        sellerId: mockOrder.sellerId,
        clientOrderId: mockOrder.clientOrderId,
      };
    });

    describe('When order does not exist (first time creation)', () => {
      it('Should successfully create a new order', async () => {
        const expectedOrder = {
          ...createOrderData,
          _id: mockOrder._id,
          status: OrderStatusEnum.CREATED,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Order;

        orderRepository.findOne.mockResolvedValue(null);
        orderRepository.create.mockResolvedValue(expectedOrder as OrderModel);

        const result = await orderService.create(createOrderData);

        expect(orderRepository.findOne).toHaveBeenCalledWith({
          sellerId: createOrderData.sellerId,
          clientOrderId: createOrderData.clientOrderId,
          customerId: createOrderData.customerId,
        });
        expect(orderRepository.create).toHaveBeenCalledWith(createOrderData);
        expect(result.order).toEqual(expectedOrder);
        expect(result.created).toBe(true);
      });
    });

    it('Should return existing order when exact same payload is sent', async () => {
      const existingOrder = {
        ...createOrderData,
        _id: mockOrder._id,
        status: OrderStatusEnum.CREATED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      orderRepository.findOne.mockResolvedValue(existingOrder);

      const result = await orderService.create(createOrderData);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        sellerId: createOrderData.sellerId,
        clientOrderId: createOrderData.clientOrderId,
        customerId: createOrderData.customerId,
      });
      expect(orderRepository.create).not.toHaveBeenCalled();
      expect(result.order).toEqual(existingOrder);
      expect(result.created).toBe(false);
    });

    it('Should return existing order when payload differs (first write wins)', async () => {
      const existingOrder = {
        ...createOrderData,
        priceCents: 999, // Different price
        quantity: 5, // Different quantity
        _id: mockOrder._id,
        status: OrderStatusEnum.CREATED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const differentPayload = {
        ...createOrderData,
        priceCents: 1000,
        quantity: 10,
      };

      orderRepository.findOne.mockResolvedValue(existingOrder);

      const result = await orderService.create(differentPayload);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        sellerId: differentPayload.sellerId,
        clientOrderId: differentPayload.clientOrderId,
        customerId: differentPayload.customerId,
      });
      expect(orderRepository.create).not.toHaveBeenCalled();
      expect(result.order).toEqual(existingOrder);
      expect(result.created).toBe(false);
    });

    it('Should handle duplicate key error and return existing order', async () => {
      const existingOrder = {
        ...createOrderData,
        _id: mockOrder._id,
        status: OrderStatusEnum.CREATED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const duplicateKeyError = {
        code: 11000,
        message: 'E11000 duplicate key error',
      };

      orderRepository.findOne
        .mockResolvedValueOnce(null) // First check returns null
        .mockResolvedValueOnce(existingOrder); // Second check after error returns existing order

      orderRepository.create.mockRejectedValue(duplicateKeyError);

      const result = await orderService.create(createOrderData);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(2);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        sellerId: createOrderData.sellerId,
        clientOrderId: createOrderData.clientOrderId,
        customerId: createOrderData.customerId,
      });
      expect(orderRepository.create).toHaveBeenCalledWith(createOrderData);
      expect(result.order).toEqual(existingOrder);
      expect(result.created).toBe(false);
    });

    it('Should throw ConflictException when duplicate key error occurs but no existing order found', async () => {
      const duplicateKeyError = {
        code: 11000,
        message: 'E11000 duplicate key error',
      };

      orderRepository.findOne
        .mockResolvedValueOnce(null) // First check returns null
        .mockResolvedValueOnce(null); // Second check after error also returns null

      orderRepository.create.mockRejectedValue(duplicateKeyError);

      await expect(orderService.create(createOrderData)).rejects.toThrow(
        ConflictException,
      );
      await expect(orderService.create(createOrderData)).rejects.toThrow(
        'Order creation failed due to concurrent modification',
      );
    });

    it('Should re-throw non-duplicate key errors', async () => {
      const databaseError = new Error('Database connection failed');

      orderRepository.findOne.mockResolvedValue(null);
      orderRepository.create.mockRejectedValue(databaseError);

      await expect(orderService.create(createOrderData)).rejects.toThrow(
        databaseError,
      );
    });
  });

  describe('On getById', () => {
    it('Should successfully return an order when it exists', async () => {
      const orderId = mockOrder._id;
      orderRepository.findById.mockResolvedValue(mockOrder);

      const result = await orderService.getById(orderId);

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(mockOrder);
    });

    it('Should throw NotFoundException when order does not exist', async () => {
      const orderId = Faker.mongoId().toString();
      orderRepository.findById.mockResolvedValue(null);

      await expect(orderService.getById(orderId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(orderService.getById(orderId)).rejects.toThrow(
        'Order not found',
      );

      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
    });
  });

  describe('On getListOrders', () => {
    let mockOrders: Order[];

    beforeAll(async () => {
      mockOrders = await Promise.all([
        orderFactory.create({
          status: OrderStatusEnum.CREATED,
          onlyData: true,
        }),
        orderFactory.create({
          status: OrderStatusEnum.ACCEPTED,
          onlyData: true,
        }),
      ]);
    });

    it('Should call repository.findPaginated with correct parameters', async () => {
      const query = {
        sellerId: '507f1f77bcf86cd799439014',
        status: OrderStatusEnum.CREATED,
        limit: 10,
        skip: 0,
      };

      const expectedResult = {
        orders: mockOrders,
        total: 2,
      };

      orderRepository.findPaginated.mockResolvedValue(expectedResult);

      const result = await orderService.getListOrders(query);

      expect(orderRepository.findPaginated).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });
});
