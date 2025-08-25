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
import { ContentDispositionEnum, IUploadedFile } from '@app/shared';
import { Faker } from '@app/shared';
import { InvoiceFactory } from '../../../test/factories/invoice.factory';

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;
  let mockInvoiceRepository: jest.Mocked<InvoiceRepository>;
  let mockS3Service: jest.Mocked<S3Service>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let invoiceFactory: InvoiceFactory;
  let module: TestingModule;
  let mockInvoice;
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

    module = await Test.createTestingModule({
      providers: [
        InvoiceService,
        mockInvoiceRepositoryProvider,
        mockS3ServiceProvider,
        mockConfigServiceProvider,
      ],
    }).compile();
    invoiceFactory = new InvoiceFactory(module);

    mockInvoice = await invoiceFactory.create({ onlyData: true });
  });

  beforeEach(() => {
    invoiceService = module.get<InvoiceService>(InvoiceService);
    mockInvoiceRepository = module.get(InvoiceRepository);
    mockS3Service = module.get(S3Service);
    mockConfigService = module.get(ConfigService);

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
      await expect(
        invoiceService.uploadInvoice(orderId, mockUploadedFile),
      ).rejects.toThrow('Failed to upload invoice');

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
      await expect(
        invoiceService.uploadInvoice(orderId, mockUploadedFile),
      ).rejects.toThrow('Failed to upload invoice');

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
      await expect(
        invoiceService.generateInvoiceDownloadUrl(invoiceId, disposition),
      ).rejects.toThrow('Failed to generate download URL');

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
});
