import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceService } from '../invoice.service';
import { InvoiceRepository } from '../../repositories/invoice.repository';
import { S3Service } from '@app/s3';
import { InvoiceModel } from '../../models/invoice.model';
import {
  ContentDispositionEnum,
  IUploadedFile,
  OrderStatusEnum,
} from '@app/shared';
import { Faker } from '@app/shared';
import {
  InvoiceFactory,
  OrderProjectionFactory,
} from '../../../test/factories';
import { OrderProjectionService } from '../order-projection.service';

describe('On InvoiceService', () => {
  let invoiceService: InvoiceService;
  let mockInvoiceRepository: jest.Mocked<InvoiceRepository>;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockOrderProjectionService: jest.Mocked<OrderProjectionService>;
  let invoiceFactory: InvoiceFactory;
  let orderProjectionFactory: OrderProjectionFactory;
  let module: TestingModule;
  let mockInvoice;
  let mockOrderProjection;
  const mockUploadedFile: IUploadedFile = {
    filename: 'test-invoice.pdf',
    originalname: 'test-invoice.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test pdf content'),
    size: 1024,
  };

  beforeAll(async () => {
    const mockInvoiceRepositoryProvider = {
      provide: InvoiceRepository,
      useValue: {
        findById: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
        generateObjectId: jest.fn(),
        findOneAndUpdate: jest.fn(),
      },
    };

    const mockS3ServiceProvider = {
      provide: S3Service,
      useValue: {
        uploadFile: jest.fn(),
        generatePresignedUrl: jest.fn(),
      },
    };

    const mockConfigServiceProvider = {
      provide: ConfigService,
      useValue: {
        get: jest.fn(),
      },
    };

    const mockOrderProjectionServiceProvider = {
      provide: OrderProjectionService,
      useValue: {
        getByOrderId: jest.fn(),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        InvoiceService,
        mockInvoiceRepositoryProvider,
        mockS3ServiceProvider,
        mockConfigServiceProvider,
        mockOrderProjectionServiceProvider,
      ],
    }).compile();
    invoiceFactory = new InvoiceFactory(module);
    orderProjectionFactory = new OrderProjectionFactory(module);

    mockInvoice = await invoiceFactory.create({ onlyData: true });
    mockOrderProjection = await orderProjectionFactory.create({
      onlyData: true,
    });
  });

  beforeEach(() => {
    invoiceService = module.get<InvoiceService>(InvoiceService);
    mockInvoiceRepository = module.get(InvoiceRepository);
    mockS3Service = module.get(S3Service);
    mockConfigService = module.get(ConfigService);
    mockOrderProjectionService = module.get(OrderProjectionService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        INVOICE_BUCKET_NAME: 'test-bucket',
        S3_URL_TTL_SEC_DEFAULT: 300,
      };
      return config[key];
    });

    // Setup default mock implementations
    mockInvoiceRepository.generateObjectId.mockReturnValue(
      Faker.mongoId().toString(),
    );

    // Setup default mock implementations for OrderProjectionService
    mockOrderProjectionService.getByOrderId.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('On uploadInvoice', () => {
    const orderId = Faker.mongoId().toString();

    it('Should successfully upload an invoice', async () => {
      const generatedId = Faker.mongoId().toString();
      const fileName = `${generatedId}.pdf`;
      const objectKey = `${orderId}/invoices/${fileName}`;
      const expectedInvoice = {
        ...mockInvoice,
        _id: generatedId,
        orderId,
        url: objectKey,
      } as unknown as InvoiceModel;

      mockInvoiceRepository.findOne.mockResolvedValue(null);
      mockInvoiceRepository.generateObjectId.mockReturnValue(generatedId);
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockInvoiceRepository.create.mockResolvedValue(expectedInvoice);

      const result = await invoiceService.uploadInvoice(
        orderId,
        mockUploadedFile,
      );

      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockInvoiceRepository.generateObjectId).toHaveBeenCalledTimes(2);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith({
        bucket: 'invoice',
        key: objectKey,
        file: mockUploadedFile.buffer,
        contentType: 'application/pdf',
        contentLength: mockUploadedFile.buffer.length,
      });
      expect(mockInvoiceRepository.create).toHaveBeenCalledWith({
        _id: generatedId,
        orderId,
        url: objectKey,
        sentAt: null,
      });
      expect(result).toEqual(expectedInvoice);
    });

    it('Should throw ConflictException when invoice already exists for order', async () => {
      mockInvoiceRepository.findOne.mockResolvedValue(mockInvoice);

      await expect(
        invoiceService.uploadInvoice(orderId, mockUploadedFile),
      ).rejects.toThrow(ConflictException);
      await expect(
        invoiceService.uploadInvoice(orderId, mockUploadedFile),
      ).rejects.toThrow(`Invoice already exists for order ${orderId}`);

      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.create).not.toHaveBeenCalled();
    });

    it('Should throw InternalServerErrorException when S3 upload fails', async () => {
      const s3Error = new Error('S3 upload failed');

      mockInvoiceRepository.findOne.mockResolvedValue(null);
      mockS3Service.uploadFile.mockRejectedValue(s3Error);

      await expect(
        invoiceService.uploadInvoice(orderId, mockUploadedFile),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
      expect(mockInvoiceRepository.create).not.toHaveBeenCalled();
    });

    it('Should throw InternalServerErrorException when repository create fails', async () => {
      const dbError = new Error('Database connection failed');

      mockInvoiceRepository.findOne.mockResolvedValue(null);
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockInvoiceRepository.create.mockRejectedValue(dbError);

      await expect(
        invoiceService.uploadInvoice(orderId, mockUploadedFile),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
      expect(mockInvoiceRepository.create).toHaveBeenCalled();
    });
  });

  describe('On generateInvoiceDownloadUrl', () => {
    const invoiceId = Faker.mongoId().toString();

    it('Should generate a pre-signed URL successfully for inline disposition', async () => {
      const disposition = ContentDispositionEnum.INLINE;
      const expectedUrl = Faker.url();
      const ttlSeconds = 300;
      const expectedExpiresAt = new Date(
        Date.now() + ttlSeconds * 1000,
      ).toISOString();

      mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);
      mockS3Service.generatePresignedUrl.mockResolvedValue(expectedUrl);

      const result = await invoiceService.generateInvoiceDownloadUrl(
        invoiceId,
        disposition,
      );

      expect(result.url).toBe(expectedUrl);
      // Check that expiresAt is within 1 second of expected
      const resultTime = new Date(result.expiresAt).getTime();
      const expectedTime = new Date(expectedExpiresAt).getTime();
      expect(Math.abs(resultTime - expectedTime)).toBeLessThan(1000);

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockS3Service.generatePresignedUrl).toHaveBeenCalledWith({
        bucket: 'invoice',
        key: mockInvoice.url,
        expiresIn: 300,
        contentType: 'application/pdf',
        contentDisposition: `inline; filename="${invoiceId}.pdf"`,
      });
    });

    it('Should generate a pre-signed URL successfully for attachment disposition', async () => {
      const disposition = ContentDispositionEnum.ATTACHMENT;
      const expectedUrl = Faker.url();
      const ttlSeconds = 300;
      const expectedExpiresAt = new Date(
        Date.now() + ttlSeconds * 1000,
      ).toISOString();

      mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);
      mockS3Service.generatePresignedUrl.mockResolvedValue(expectedUrl);

      const result = await invoiceService.generateInvoiceDownloadUrl(
        invoiceId,
        disposition,
      );

      expect(result.url).toBe(expectedUrl);
      // Check that expiresAt is within 1 second of expected
      const resultTime = new Date(result.expiresAt).getTime();
      const expectedTime = new Date(expectedExpiresAt).getTime();
      expect(Math.abs(resultTime - expectedTime)).toBeLessThan(1000);

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockS3Service.generatePresignedUrl).toHaveBeenCalledWith({
        bucket: 'invoice',
        key: mockInvoice.url,
        expiresIn: 300,
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="${invoiceId}.pdf"`,
      });
    });

    it('Should throw NotFoundException when invoice is not found', async () => {
      const disposition = ContentDispositionEnum.INLINE;

      mockInvoiceRepository.findById.mockResolvedValue(null);

      await expect(
        invoiceService.generateInvoiceDownloadUrl(invoiceId, disposition),
      ).rejects.toThrow(NotFoundException);
      await expect(
        invoiceService.generateInvoiceDownloadUrl(invoiceId, disposition),
      ).rejects.toThrow('Invoice not found');

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockS3Service.generatePresignedUrl).not.toHaveBeenCalled();
    });

    it('Should throw InternalServerErrorException when S3 service fails', async () => {
      const disposition = ContentDispositionEnum.INLINE;
      const s3Error = new Error('S3 service error');

      mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);
      mockS3Service.generatePresignedUrl.mockRejectedValue(s3Error);

      await expect(
        invoiceService.generateInvoiceDownloadUrl(invoiceId, disposition),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockS3Service.generatePresignedUrl).toHaveBeenCalled();
    });

    it('Should re-throw NotFoundException when repository throws it', async () => {
      const disposition = ContentDispositionEnum.INLINE;
      const notFoundError = new NotFoundException('Invoice not found');

      mockInvoiceRepository.findById.mockRejectedValue(notFoundError);

      await expect(
        invoiceService.generateInvoiceDownloadUrl(invoiceId, disposition),
      ).rejects.toThrow(NotFoundException);

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockS3Service.generatePresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('On getInvoices', () => {
    it('Should return invoices from repository', async () => {
      const query = { orderId: Faker.mongoId().toString() };
      const expectedInvoices = [mockInvoice];

      mockInvoiceRepository.find.mockResolvedValue(expectedInvoices);

      const result = await invoiceService.getInvoices(query);

      expect(mockInvoiceRepository.find).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedInvoices);
    });

    it('Should return empty array when no invoices found', async () => {
      const query = { orderId: Faker.mongoId().toString() };

      mockInvoiceRepository.find.mockResolvedValue([]);

      const result = await invoiceService.getInvoices(query);

      expect(mockInvoiceRepository.find).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });

  describe('On getInvoiceById', () => {
    const invoiceId = Faker.mongoId().toString();

    it('Should return invoice when it exists', async () => {
      mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

      const result = await invoiceService.getInvoiceById(invoiceId);

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(result).toEqual(mockInvoice);
    });

    it('Should throw NotFoundException when invoice does not exist', async () => {
      mockInvoiceRepository.findById.mockResolvedValue(null);

      await expect(invoiceService.getInvoiceById(invoiceId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(invoiceService.getInvoiceById(invoiceId)).rejects.toThrow(
        'Invoice not found',
      );

      expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
    });
  });

  describe('On tryMarkInvoiceAsSent', () => {
    const orderId = Faker.mongoId().toString();

    beforeEach(() => {
      mockOrderProjectionService.getByOrderId.mockReset();
      mockInvoiceRepository.findOne.mockReset();
      mockInvoiceRepository.findOneAndUpdate.mockReset();
    });

    it('Should mark invoice as sent when order is shipped and invoice exists', async () => {
      const shippedProjection = {
        ...mockOrderProjection,
        status: OrderStatusEnum.SHIPPED,
      };
      const invoiceToUpdate = {
        ...mockInvoice,
        _id: Faker.mongoId().toString(),
        orderId,
        sentAt: null,
      } as InvoiceModel;

      mockOrderProjectionService.getByOrderId.mockResolvedValue(
        shippedProjection,
      );
      mockInvoiceRepository.findOne.mockResolvedValue(invoiceToUpdate);
      mockInvoiceRepository.findOneAndUpdate.mockResolvedValue(null);

      await invoiceService.tryMarkInvoiceAsSent(orderId);

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockInvoiceRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { orderId },
        { sentAt: expect.any(Date) },
      );
    });

    it('Should mark invoice as sent when order is shipped and invoice is provided as parameter', async () => {
      const shippedProjection = {
        ...mockOrderProjection,
        status: OrderStatusEnum.SHIPPED,
      };
      const providedInvoice = {
        ...mockInvoice,
        _id: Faker.mongoId().toString(),
        orderId,
        sentAt: null,
      } as InvoiceModel;

      mockOrderProjectionService.getByOrderId.mockResolvedValue(
        shippedProjection,
      );
      mockInvoiceRepository.findOneAndUpdate.mockResolvedValue(null);

      await invoiceService.tryMarkInvoiceAsSent(orderId, providedInvoice);

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { orderId },
        { sentAt: expect.any(Date) },
      );
    });

    it('Should skip sentAt update when order is not shipped', async () => {
      const notShippedProjection = {
        ...mockOrderProjection,
        status: OrderStatusEnum.CREATED,
      };

      mockOrderProjectionService.getByOrderId.mockResolvedValue(
        notShippedProjection,
      );

      await invoiceService.tryMarkInvoiceAsSent(orderId);

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should skip sentAt update when order projection is not found', async () => {
      mockOrderProjectionService.getByOrderId.mockResolvedValue(null);

      await invoiceService.tryMarkInvoiceAsSent(orderId);

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should skip sentAt update when no invoice is found for order', async () => {
      const shippedProjection = {
        ...mockOrderProjection,
        status: OrderStatusEnum.SHIPPED,
      };

      mockOrderProjectionService.getByOrderId.mockResolvedValue(
        shippedProjection,
      );
      mockInvoiceRepository.findOne.mockResolvedValue(null);

      await invoiceService.tryMarkInvoiceAsSent(orderId);

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockInvoiceRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should skip sentAt update when invoice is already marked as sent', async () => {
      const shippedProjection = {
        ...mockOrderProjection,
        status: OrderStatusEnum.SHIPPED,
      };
      const alreadySentInvoice = {
        ...mockInvoice,
        _id: Faker.mongoId().toString(),
        orderId,
        sentAt: new Date('2024-01-01T00:00:00Z'),
      } as InvoiceModel;

      mockOrderProjectionService.getByOrderId.mockResolvedValue(
        shippedProjection,
      );
      mockInvoiceRepository.findOne.mockResolvedValue(alreadySentInvoice);

      await invoiceService.tryMarkInvoiceAsSent(orderId);

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockInvoiceRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should handle errors gracefully and log them', async () => {
      const error = new Error('Database connection failed');
      mockOrderProjectionService.getByOrderId.mockRejectedValue(error);

      await expect(
        invoiceService.tryMarkInvoiceAsSent(orderId),
      ).resolves.not.toThrow();

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('Should handle repository update errors gracefully and log them', async () => {
      const shippedProjection = {
        ...mockOrderProjection,
        status: OrderStatusEnum.SHIPPED,
      };
      const invoiceToUpdate = {
        ...mockInvoice,
        _id: Faker.mongoId().toString(),
        orderId,
        sentAt: null,
      } as InvoiceModel;
      const updateError = new Error('Update failed');

      mockOrderProjectionService.getByOrderId.mockResolvedValue(
        shippedProjection,
      );
      mockInvoiceRepository.findOne.mockResolvedValue(invoiceToUpdate);
      mockInvoiceRepository.findOneAndUpdate.mockRejectedValue(updateError);

      await expect(
        invoiceService.tryMarkInvoiceAsSent(orderId),
      ).resolves.not.toThrow();

      expect(mockOrderProjectionService.getByOrderId).toHaveBeenCalledWith(
        orderId,
      );
      expect(mockInvoiceRepository.findOne).toHaveBeenCalledWith({ orderId });
      expect(mockInvoiceRepository.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
