import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InvoiceModule } from '../src/invoice.module';
import { TestAppModuleClass, TestUtils, Faker } from '@app/shared';
import { buildApp } from '../src/main';
import { InvoiceFactory } from './factories/invoice.factory';
import { App } from 'supertest/types';
import { Invoice } from '../src/types/invoice-repository.types';
import { ContentDispositionEnum } from '@app/shared';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('On InvoiceController', () => {
  let app: INestApplication;
  let testAppModuleClass: TestAppModuleClass;
  let testUtils: TestUtils;
  let invoiceFactory: InvoiceFactory;
  let httpServer: App;

  beforeAll(async () => {
    testAppModuleClass = new TestAppModuleClass(
      InvoiceModule,
      TestUtils,
      buildApp,
    );

    app = await testAppModuleClass.getApp();
    httpServer = app.getHttpServer() as App;
    const moduleRef = await testAppModuleClass.getAppModule();
    testUtils = moduleRef.get<TestUtils>(TestUtils);
    invoiceFactory = new InvoiceFactory(moduleRef);
  });

  beforeEach(async () => {
    await testUtils.dropDatabase();
  });

  afterAll(async () => {
    await testUtils.shutdownServer(app);
  });

  describe('POST /invoices/upload', () => {
    let uploadInvoiceData;
    let testPdfBuffer: Buffer;

    beforeEach(async () => {
      uploadInvoiceData = await invoiceFactory.create({
        onlyData: true,
      });

      testPdfBuffer = await fs.readFile(
        path.join(__dirname, 'data', 'test-invoice.pdf'),
      );
    });

    it('Should upload an invoice PDF file successfully and persist it to database', async () => {
      const response = await request(httpServer)
        .post('/invoices/upload')
        .field('orderId', uploadInvoiceData.orderId)
        .attach('file', testPdfBuffer, 'test-invoice.pdf')
        .expect(201);

      expect(response.body).toMatchObject({
        _id: expect.any(String) as string,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
        orderId: uploadInvoiceData.orderId,
        url: expect.any(String) as string,
        sentAt: null,
      });
    });

    it('Should return 400 when orderId is missing', async () => {
      const response = await request(httpServer)
        .post('/invoices/upload')
        .attach('file', testPdfBuffer, 'test-invoice.pdf')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when file is missing', async () => {
      const response = await request(httpServer)
        .post('/invoices/upload')
        .field('orderId', uploadInvoiceData.orderId)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'File is required',
      });
    });

    it('Should return 400 when orderId is not a valid mongo id', async () => {
      const response = await request(httpServer)
        .post('/invoices/upload')
        .field('orderId', 'invalid-id')
        .attach('file', testPdfBuffer, 'test-invoice.pdf')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when file is not a PDF', async () => {
      const textBuffer = Buffer.from('This is not a PDF file');

      const response = await request(httpServer)
        .post('/invoices/upload')
        .field('orderId', uploadInvoiceData.orderId)
        .attach('file', textBuffer, 'test.txt')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
      });
    });

    it('Should return 400 when file size exceeds 10MB limit', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const response = await request(httpServer)
        .post('/invoices/upload')
        .field('orderId', uploadInvoiceData.orderId)
        .attach('file', largeBuffer, 'large-invoice.pdf')
        .expect(413);

      expect(response.body).toMatchObject({
        statusCode: 413,
        error: 'Payload Too Large',
      });
    });

    it('Should handle multiple file uploads and use the first file', async () => {
      const secondPdfBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Second PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000111 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF\n',
      );

      const response = await request(httpServer)
        .post('/invoices/upload')
        .field('orderId', uploadInvoiceData.orderId)
        .attach('file', testPdfBuffer, 'first-invoice.pdf')
        .attach('file', secondPdfBuffer, 'second-invoice.pdf')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });
  });

  describe('GET /invoices', () => {
    let baseInvoicesCount: number;

    beforeEach(async () => {
      baseInvoicesCount = Faker.integer({ min: 1, max: 10 });
      const baseInvoicesCreationPromises: Promise<Invoice>[] = [];
      for (let i = 0; i < baseInvoicesCount; i++) {
        baseInvoicesCreationPromises.push(invoiceFactory.create({}));
      }
      await Promise.all(baseInvoicesCreationPromises);
    });

    it('Should filter invoices by orderId', async () => {
      const orderId = Faker.mongoId().toString();
      await invoiceFactory.create({ orderId });

      const response = await request(httpServer)
        .get('/invoices')
        .query({ orderId })
        .expect(200);

      expect(response.body[0]).toMatchObject({
        _id: expect.any(String) as string,
        orderId: orderId,
        url: expect.any(String) as string,
      });
    });

    it('Should return 400 when orderId is not a valid mongo id', async () => {
      const response = await request(httpServer)
        .get('/invoices')
        .query({ orderId: 'invalid-id' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return empty result when no invoices match the filter', async () => {
      const nonExistentOrderId = Faker.mongoId().toString();

      const response = await request(httpServer)
        .get('/invoices')
        .query({ orderId: nonExistentOrderId })
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /invoices/:id', () => {
    it('Should retrieve an existing invoice by ID successfully', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const response = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        _id: createdInvoice._id.toString(),
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
        orderId: createdInvoice.orderId,
        url: createdInvoice.url,
        sentAt: createdInvoice.sentAt,
      });
    });

    it('Should return 400 when invoice ID is not a valid mongo id', async () => {
      const invalidId = 'invalid-mongo-id';

      const response = await request(httpServer)
        .get(`/invoices/${invalidId}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: ['id must be a mongodb id'],
        error: 'Bad Request',
      });
    });

    it('Should return 404 when invoice with given ID does not exist', async () => {
      const nonExistentId = Faker.mongoId().toString();

      const response = await request(httpServer)
        .get(`/invoices/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    });
  });

  describe('GET /invoices/:id/url', () => {
    it('Should generate pre-signed URL for invoice successfully', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const response = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .expect(200);

      expect(response.body).toMatchObject({
        url: expect.any(String) as string,
        expiresAt: expect.any(String) as string,
      });
    });

    it('Should generate pre-signed URL with inline disposition', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const response = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .query({ disposition: ContentDispositionEnum.INLINE })
        .expect(200);

      expect(response.body).toMatchObject({
        url: expect.any(String) as string,
        expiresAt: expect.any(String) as string,
      });
    });

    it('Should generate pre-signed URL with attachment disposition', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const response = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .query({ disposition: ContentDispositionEnum.ATTACHMENT })
        .expect(200);

      expect(response.body).toMatchObject({
        url: expect.any(String) as string,
        expiresAt: expect.any(String) as string,
      });
    });

    it('Should return 400 when invoice ID is not a valid mongo id', async () => {
      const invalidId = 'invalid-mongo-id';

      const response = await request(httpServer)
        .get(`/invoices/${invalidId}/url`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 404 when invoice with given ID does not exist', async () => {
      const nonExistentId = Faker.mongoId().toString();

      const response = await request(httpServer)
        .get(`/invoices/${nonExistentId}/url`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
    });

    it('Should return 400 when disposition is not a valid enum value', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const response = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .query({ disposition: 'INVALID_DISPOSITION' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should use default disposition when not specified', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const response = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .expect(200);

      expect(response.body).toMatchObject({
        url: expect.any(String) as string,
        expiresAt: expect.any(String) as string,
      });
    });

    it('Should generate different URLs for different dispositions', async () => {
      const createdInvoice = await invoiceFactory.create({});

      const inlineResponse = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .query({ disposition: ContentDispositionEnum.INLINE })
        .expect(200);

      const attachmentResponse = await request(httpServer)
        .get(`/invoices/${createdInvoice._id}/url`)
        .query({ disposition: ContentDispositionEnum.ATTACHMENT })
        .expect(200);

      expect(inlineResponse.body.url).not.toBe(attachmentResponse.body.url);
    });
  });
});
