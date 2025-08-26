import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrderProjectionService } from '../order-projection.service';
import { OrderProjectionRepository } from '../../repositories/order-projection.repository';
import { OrderStatus, OrderStatusEnum } from '@app/shared';
import { Faker } from '@app/shared';
import { OrderProjectionFactory } from '../../../test/factories';

describe('On OrderProjectionService', () => {
  let orderProjectionService: OrderProjectionService;
  let mockOrderProjectionRepository: jest.Mocked<OrderProjectionRepository>;
  let orderProjectionFactory: OrderProjectionFactory;
  let module: TestingModule;
  let mockOrderProjection;

  beforeAll(async () => {
    const mockOrderProjectionRepositoryProvider = {
      provide: OrderProjectionRepository,
      useValue: {
        findOne: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
        findOneAndUpdate: jest.fn(),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        OrderProjectionService,
        mockOrderProjectionRepositoryProvider,
      ],
    }).compile();

    orderProjectionFactory = new OrderProjectionFactory(module);
    mockOrderProjection = await orderProjectionFactory.create({
      onlyData: true,
    });
  });

  beforeEach(() => {
    orderProjectionService = module.get<OrderProjectionService>(
      OrderProjectionService,
    );
    mockOrderProjectionRepository = module.get(OrderProjectionRepository);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByOrderId', () => {
    const orderId = Faker.mongoId().toString();

    it('Should return order projection when it exists', async () => {
      const expectedProjection = {
        ...mockOrderProjection,
        orderId,
        status: OrderStatusEnum.CREATED,
      };

      mockOrderProjectionRepository.findOne.mockResolvedValue(
        expectedProjection,
      );

      const result = await orderProjectionService.getByOrderId(orderId);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(result).toEqual(expectedProjection);
    });

    it('Should return null when order projection does not exist', async () => {
      mockOrderProjectionRepository.findOne.mockResolvedValue(null);

      const result = await orderProjectionService.getByOrderId(orderId);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(result).toBeNull();
    });
  });

  describe('createOrUpdate', () => {
    const orderId = Faker.mongoId().toString();

    it('Should create new order projection when none exists', async () => {
      const newStatus = OrderStatusEnum.ACCEPTED;

      mockOrderProjectionRepository.findOne.mockResolvedValue(null);
      mockOrderProjectionRepository.create.mockResolvedValue({
        ...mockOrderProjection,
        orderId,
        status: newStatus,
      });

      await orderProjectionService.createOrUpdate(orderId, newStatus);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(mockOrderProjectionRepository.create).toHaveBeenCalledWith({
        orderId,
        status: newStatus,
      });
    });

    it('Should log creation of new order projection', async () => {
      const newStatus = OrderStatusEnum.ACCEPTED;
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      mockOrderProjectionRepository.findOne.mockResolvedValue(null);
      mockOrderProjectionRepository.upsert.mockResolvedValue({
        ...mockOrderProjection,
        orderId,
        status: newStatus,
      });

      await orderProjectionService.createOrUpdate(orderId, newStatus);

      expect(logSpy).toHaveBeenCalledWith('Created new order projection', {
        orderId,
        status: newStatus,
      });

      logSpy.mockRestore();
    });

    it('Should update projection when new status has higher rank', async () => {
      const existingProjection = {
        ...mockOrderProjection,
        orderId,
        status: OrderStatusEnum.CREATED, // Rank 0
      };
      const newStatus = OrderStatusEnum.ACCEPTED; // Rank 1

      mockOrderProjectionRepository.findOne.mockResolvedValue(
        existingProjection,
      );
      mockOrderProjectionRepository.findOneAndUpdate.mockResolvedValue({
        ...mockOrderProjection,
        orderId,
        status: newStatus,
      });

      await orderProjectionService.createOrUpdate(orderId, newStatus);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(
        mockOrderProjectionRepository.findOneAndUpdate,
      ).toHaveBeenCalledWith({ orderId }, { orderId, status: newStatus });
    });

    it('Should update projection when new status has equal rank', async () => {
      const existingProjection = {
        ...mockOrderProjection,
        orderId,
        status: OrderStatusEnum.CREATED, // Rank 0
      };
      const newStatus = OrderStatusEnum.CREATED; // Rank 0

      mockOrderProjectionRepository.findOne.mockResolvedValue(
        existingProjection,
      );
      mockOrderProjectionRepository.findOneAndUpdate.mockResolvedValue({
        ...mockOrderProjection,
        orderId,
        status: newStatus,
      });

      await orderProjectionService.createOrUpdate(orderId, newStatus);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(
        mockOrderProjectionRepository.findOneAndUpdate,
      ).toHaveBeenCalledWith({ orderId }, { orderId, status: newStatus });
    });

    it('Should ignore update when new status has lower rank', async () => {
      const existingProjection = {
        ...mockOrderProjection,
        orderId,
        status: OrderStatusEnum.SHIPPED, // Rank 3
      };
      const newStatus = OrderStatusEnum.ACCEPTED; // Rank 1

      mockOrderProjectionRepository.findOne.mockResolvedValue(
        existingProjection,
      );

      await orderProjectionService.createOrUpdate(orderId, newStatus);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(
        mockOrderProjectionRepository.findOneAndUpdate,
      ).not.toHaveBeenCalled();
    });

    it('Should handle all status transitions correctly', async () => {
      const testCases = [
        {
          from: OrderStatusEnum.CREATED,
          to: OrderStatusEnum.ACCEPTED,
          shouldUpdate: true,
        },
        {
          from: OrderStatusEnum.ACCEPTED,
          to: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          shouldUpdate: true,
        },
        {
          from: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          to: OrderStatusEnum.SHIPPED,
          shouldUpdate: true,
        },
        {
          from: OrderStatusEnum.SHIPPED,
          to: OrderStatusEnum.REJECTED,
          shouldUpdate: true,
        },
        {
          from: OrderStatusEnum.ACCEPTED,
          to: OrderStatusEnum.CREATED,
          shouldUpdate: false,
        },
        {
          from: OrderStatusEnum.SHIPPING_IN_PROGRESS,
          to: OrderStatusEnum.ACCEPTED,
          shouldUpdate: false,
        },
      ];

      for (const testCase of testCases) {
        const existingProjection = {
          ...mockOrderProjection,
          orderId,
          status: testCase.from,
        };

        mockOrderProjectionRepository.findOne.mockResolvedValue(
          existingProjection,
        );
        if (testCase.shouldUpdate) {
          mockOrderProjectionRepository.findOneAndUpdate.mockResolvedValue({
            ...mockOrderProjection,
            orderId,
            status: testCase.to,
          });
        }

        await orderProjectionService.createOrUpdate(orderId, testCase.to);

        if (testCase.shouldUpdate) {
          expect(
            mockOrderProjectionRepository.findOneAndUpdate,
          ).toHaveBeenCalledWith({ orderId }, { orderId, status: testCase.to });
        } else {
          expect(
            mockOrderProjectionRepository.findOneAndUpdate,
          ).not.toHaveBeenCalled();
        }

        jest.clearAllMocks();
      }
    });

    it('Should handle unknown status gracefully', async () => {
      const existingProjection = {
        ...mockOrderProjection,
        orderId,
        status: OrderStatusEnum.CREATED,
      };
      const unknownStatus = 'UNKNOWN_STATUS' as OrderStatus;

      mockOrderProjectionRepository.findOne.mockResolvedValue(
        existingProjection,
      );

      await orderProjectionService.createOrUpdate(orderId, unknownStatus);

      expect(mockOrderProjectionRepository.findOne).toHaveBeenCalledWith({
        orderId,
      });
      expect(
        mockOrderProjectionRepository.findOneAndUpdate,
      ).not.toHaveBeenCalled();
    });
  });
});
