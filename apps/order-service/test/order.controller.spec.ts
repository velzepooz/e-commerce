import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderServiceModule } from '../src/order-service.module';
import { TestAppModuleClass, TestUtils } from '../../../libs/shared/src/test';
import { buildApp } from '../src/main';
import { createOrderType, OrderFactory } from './factories';
import { App } from 'supertest/types';

describe('On OrderServiceController', () => {
  let app: INestApplication;
  let testAppModuleClass: TestAppModuleClass;
  let testUtils: TestUtils;
  let orderFactory: OrderFactory;
  let httpServer: App;

  beforeAll(async () => {
    testAppModuleClass = new TestAppModuleClass(
      OrderServiceModule,
      TestUtils,
      buildApp,
    );

    app = await testAppModuleClass.getApp();
    httpServer = app.getHttpServer() as App;
    const moduleRef = await testAppModuleClass.getAppModule();
    testUtils = moduleRef.get<TestUtils>(TestUtils);
    orderFactory = new OrderFactory(moduleRef);
  });

  beforeEach(async () => {
    await testUtils.dropDatabase();
  });

  afterAll(async () => {
    await testUtils.shutdownServer(app);
  });

  describe('POST /orders', () => {
    let createOrderData: createOrderType;

    beforeEach(async () => {
      const order = await orderFactory.create({
        onlyData: true,
      });
      createOrderData = {
        priceCents: order.priceCents,
        quantity: order.quantity,
        productId: order.productId,
        customerId: order.customerId,
        sellerId: order.sellerId,
      };
    });

    it('Should create a new order successfully and persist it to database', async () => {
      const response = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(201);

      expect(response.body).toMatchObject({
        _id: expect.any(String) as string,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
        priceCents: createOrderData.priceCents,
        quantity: createOrderData.quantity,
        productId: createOrderData.productId,
        customerId: createOrderData.customerId,
        sellerId: createOrderData.sellerId,
        status: 'CREATED',
      });
    });

    it('Should return 400 when priceCents is missing and not create database record', async () => {
      const invalidData = await orderFactory.create({
        priceCents: 0,
      });

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when priceCents is zero or negative', async () => {
      const invalidData = await orderFactory.create({
        priceCents: 0,
      });

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when quantity is missing', async () => {
      const invalidData = await orderFactory.create({
        quantity: 0,
      });

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when productId is not a valid mongo id', async () => {
      const invalidData = await orderFactory.create({
        productId: 'invalid-id',
      });

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when customerId is not a valid mongo id', async () => {
      const invalidData = await orderFactory.create({
        customerId: 'invalid-id',
      });

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 error when sellerId is not a valid mongo id', async () => {
      const invalidData = await orderFactory.create({
        sellerId: 'invalid-id',
      });

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });
  });
});
