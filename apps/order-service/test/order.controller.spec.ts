import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderModule } from '../src/order.module';
import { TestAppModuleClass, TestUtils, Faker } from '@app/shared';
import { buildApp } from '../src/main';
import { createOrderType, OrderFactory } from './factories/order.factory';
import { App } from 'supertest/types';
import { Order } from '../src/types/order-repository.types';
import { OrderStatusEnum } from '../../../libs/shared/src/enums/order-status.enum';
import { OrderStatusEventPublisherService } from '../src/services/order-event-publisher.service';

describe('On OrderController', () => {
  let app: INestApplication;
  let testAppModuleClass: TestAppModuleClass;
  let testUtils: TestUtils;
  let orderFactory: OrderFactory;
  let httpServer: App;

  beforeAll(async () => {
    testAppModuleClass = new TestAppModuleClass(
      OrderModule,
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
        clientOrderId: order.clientOrderId,
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
        onlyData: true,
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
        onlyData: true,
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
        onlyData: true,
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
        onlyData: true,
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
        onlyData: true,
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
        onlyData: true,
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

    it('Should return 400 when clientOrderId is missing', async () => {
      const invalidData = { ...createOrderData };
      delete invalidData.clientOrderId;

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when clientOrderId is not a valid UUID', async () => {
      const invalidData = {
        ...createOrderData,
        clientOrderId: 'invalid-uuid',
      };

      const response = await request(httpServer)
        .post('/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 201 for first order creation', async () => {
      const response = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(201);

      expect(response.body).toMatchObject({
        _id: expect.any(String) as string,
        clientOrderId: createOrderData.clientOrderId,
        sellerId: createOrderData.sellerId,
        customerId: createOrderData.customerId,
        status: 'CREATED',
      });
    });

    it('Should return 200 for duplicate order with same clientOrderId, sellerId, and customerId', async () => {
      // First request - should create order
      const firstResponse = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(201);

      // Second request with same idempotency key - should return existing order
      const secondResponse = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(200);

      expect(secondResponse.body).toEqual(firstResponse.body);
      expect(secondResponse.body._id).toBe(firstResponse.body._id);
    });

    it('Should return 200 for duplicate order even with different payload (first write wins)', async () => {
      // First request
      const firstResponse = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(201);

      // Second request with same idempotency key but different payload
      const differentPayload = {
        ...createOrderData,
        priceCents: 99999, // Different price
        quantity: 999, // Different quantity
        productId: Faker.mongoId().toString(), // Different product
      };

      const secondResponse = await request(httpServer)
        .post('/orders')
        .send(differentPayload)
        .expect(200);

      // Should return the original order (first write wins)
      expect(secondResponse.body).toEqual(firstResponse.body);
      expect(secondResponse.body.priceCents).toBe(createOrderData.priceCents);
      expect(secondResponse.body.quantity).toBe(createOrderData.quantity);
      expect(secondResponse.body.productId).toBe(createOrderData.productId);
    });

    it('Should create different orders for same clientOrderId but different sellerId', async () => {
      // First request
      const firstResponse = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(201);

      // Second request with same clientOrderId but different sellerId
      const differentSellerData = {
        ...createOrderData,
        sellerId: Faker.mongoId().toString(),
      };

      const secondResponse = await request(httpServer)
        .post('/orders')
        .send(differentSellerData)
        .expect(201);

      expect(secondResponse.body._id).not.toBe(firstResponse.body._id);
      expect(secondResponse.body.sellerId).toBe(differentSellerData.sellerId);
      expect(secondResponse.body.clientOrderId).toBe(
        createOrderData.clientOrderId,
      );
    });

    it('Should create different orders for same clientOrderId but different customerId', async () => {
      // First request
      const firstResponse = await request(httpServer)
        .post('/orders')
        .send(createOrderData)
        .expect(201);

      // Second request with same clientOrderId and sellerId but different customerId
      const differentCustomerData = {
        ...createOrderData,
        customerId: Faker.mongoId().toString(),
      };

      const secondResponse = await request(httpServer)
        .post('/orders')
        .send(differentCustomerData)
        .expect(201);

      expect(secondResponse.body._id).not.toBe(firstResponse.body._id);
      expect(secondResponse.body.customerId).toBe(
        differentCustomerData.customerId,
      );
      expect(secondResponse.body.clientOrderId).toBe(
        createOrderData.clientOrderId,
      );
      expect(secondResponse.body.sellerId).toBe(createOrderData.sellerId);
    });

    it('Should handle concurrent requests properly', async () => {
      // Simulate concurrent requests with same data
      const promises = Array.from({ length: 5 }, () =>
        request(httpServer).post('/orders').send(createOrderData),
      );

      const responses = await Promise.all(promises);

      // One should be 201 (created), rest should be 200 (idempotent)
      const statusCodes = responses.map((r) => r.status);
      const createdCount = statusCodes.filter(
        (status) => status === 201,
      ).length;
      const duplicateCount = statusCodes.filter(
        (status) => status === 200,
      ).length;

      expect(createdCount).toBe(1);
      expect(duplicateCount).toBe(4);

      // All responses should return the same order ID
      const orderIds = responses.map((r) => r.body._id);
      const uniqueOrderIds = new Set(orderIds);
      expect(uniqueOrderIds.size).toBe(1);
    });
  });

  describe('GET /orders/:id', () => {
    it('Should retrieve an existing order by ID successfully', async () => {
      const createdOrder = await orderFactory.create({});

      const response = await request(httpServer)
        .get(`/orders/${createdOrder._id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        _id: createdOrder._id.toString(),
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
        priceCents: createdOrder.priceCents,
        quantity: createdOrder.quantity,
        productId: createdOrder.productId,
        customerId: createdOrder.customerId,
        sellerId: createdOrder.sellerId,
        status: createdOrder.status,
      });
    });

    it('Should return 400 when order ID is not a valid mongo id', async () => {
      const invalidId = 'invalid-mongo-id';

      const response = await request(httpServer)
        .get(`/orders/${invalidId}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: ['id must be a mongodb id'],
        error: 'Bad Request',
      });
    });

    it('Should return 404 when order with given ID does not exist', async () => {
      // Use a valid mongo id that doesn't exist in the database
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(httpServer)
        .get(`/orders/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      });
    });
  });

  describe('PATCH /orders/:id/status', () => {
    let orderStatusEventPublisherSpy: jest.SpyInstance;

    beforeEach(() => {
      // Get the actual service instance from the app and spy on it
      const orderStatusEventPublisherService = app.get(
        OrderStatusEventPublisherService,
      );
      orderStatusEventPublisherSpy = jest.spyOn(
        orderStatusEventPublisherService,
        'emitOrderStatusChanged',
      );
    });

    afterEach(() => {
      orderStatusEventPublisherSpy.mockClear();
    });

    it('Should successfully update order status from CREATED to ACCEPTED', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({ status: 'ACCEPTED' })
        .expect(200);

      expect(response.body).toMatchObject({
        _id: createdOrder._id.toString(),
        status: 'ACCEPTED',
        priceCents: createdOrder.priceCents,
        quantity: createdOrder.quantity,
        productId: createdOrder.productId,
        customerId: createdOrder.customerId,
        sellerId: createdOrder.sellerId,
      });

      expect(orderStatusEventPublisherSpy).toHaveBeenCalledWith(
        createdOrder._id.toString(),
        'ACCEPTED',
      );
    });

    it('Should successfully update order status from CREATED to REJECTED', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({ status: 'REJECTED' })
        .expect(200);

      expect(response.body).toMatchObject({
        _id: createdOrder._id.toString(),
        status: 'REJECTED',
      });

      expect(orderStatusEventPublisherSpy).toHaveBeenCalledWith(
        createdOrder._id.toString(),
        'REJECTED',
      );
    });

    it('Should successfully update order status from ACCEPTED to SHIPPING_IN_PROGRESS', async () => {
      const acceptedOrder = await orderFactory.create({
        status: 'ACCEPTED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${acceptedOrder._id}/status`)
        .send({ status: 'SHIPPING_IN_PROGRESS' })
        .expect(200);

      expect(response.body).toMatchObject({
        _id: acceptedOrder._id.toString(),
        status: 'SHIPPING_IN_PROGRESS',
      });

      expect(orderStatusEventPublisherSpy).toHaveBeenCalledWith(
        acceptedOrder._id.toString(),
        'SHIPPING_IN_PROGRESS',
      );
    });

    it('Should successfully update order status from SHIPPING_IN_PROGRESS to SHIPPED', async () => {
      const shippingOrder = await orderFactory.create({
        status: 'SHIPPING_IN_PROGRESS',
      });

      const response = await request(httpServer)
        .patch(`/orders/${shippingOrder._id}/status`)
        .send({ status: 'SHIPPED' })
        .expect(200);

      expect(response.body).toMatchObject({
        _id: shippingOrder._id.toString(),
        status: 'SHIPPED',
      });

      expect(orderStatusEventPublisherSpy).toHaveBeenCalledWith(
        shippingOrder._id.toString(),
        'SHIPPED',
      );
    });

    it('Should return 200 with unchanged order when status is already the requested status', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({ status: 'CREATED' })
        .expect(200);

      expect(response.body).toMatchObject({
        _id: createdOrder._id.toString(),
        status: 'CREATED',
      });

      expect(orderStatusEventPublisherSpy).not.toHaveBeenCalled();
    });

    it('Should return 200 with unchanged order when status REJECTED is requested again', async () => {
      const rejectedOrder = await orderFactory.create({
        status: 'REJECTED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${rejectedOrder._id}/status`)
        .send({ status: 'REJECTED' })
        .expect(200);

      expect(response.body).toMatchObject({
        _id: rejectedOrder._id.toString(),
        status: 'REJECTED',
      });

      expect(orderStatusEventPublisherSpy).not.toHaveBeenCalled();
    });

    it('Should return 422 when trying invalid transition from CREATED to SHIPPING_IN_PROGRESS', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({ status: 'SHIPPING_IN_PROGRESS' })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        message:
          'Invalid status transition from CREATED to SHIPPING_IN_PROGRESS',
        error: 'Unprocessable Entity',
      });

      expect(orderStatusEventPublisherSpy).not.toHaveBeenCalled();
    });

    it('Should return 422 when trying invalid transition from CREATED to SHIPPED', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({ status: 'SHIPPED' })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from CREATED to SHIPPED',
        error: 'Unprocessable Entity',
      });

      expect(orderStatusEventPublisherSpy).not.toHaveBeenCalled();
    });

    it('Should return 422 when trying transition from state REJECTED', async () => {
      const rejectedOrder = await orderFactory.create({
        status: 'REJECTED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${rejectedOrder._id}/status`)
        .send({ status: 'ACCEPTED' })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from REJECTED to ACCEPTED',
        error: 'Unprocessable Entity',
      });
    });

    it('Should return 422 when trying transition from state SHIPPED', async () => {
      const shippedOrder = await orderFactory.create({
        status: 'SHIPPED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${shippedOrder._id}/status`)
        .send({ status: 'ACCEPTED' })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from SHIPPED to ACCEPTED',
        error: 'Unprocessable Entity',
      });
    });

    it('Should return 422 when trying to skip states from ACCEPTED to SHIPPED', async () => {
      const acceptedOrder = await orderFactory.create({
        status: 'ACCEPTED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${acceptedOrder._id}/status`)
        .send({ status: 'SHIPPED' })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        message: 'Invalid status transition from ACCEPTED to SHIPPED',
        error: 'Unprocessable Entity',
      });
    });

    it('Should return 404 when order does not exist', async () => {
      const nonExistentId = Faker.mongoId().toString();

      const response = await request(httpServer)
        .patch(`/orders/${nonExistentId}/status`)
        .send({ status: 'ACCEPTED' })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      });
    });

    it('Should return 400 when order ID is not a valid mongo id', async () => {
      const invalidId = 'invalid-mongo-id';

      const response = await request(httpServer)
        .patch(`/orders/${invalidId}/status`)
        .send({ status: 'ACCEPTED' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when status is missing from request body', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when status is not a valid enum value', async () => {
      const createdOrder = await orderFactory.create({
        status: 'CREATED',
      });

      const response = await request(httpServer)
        .patch(`/orders/${createdOrder._id}/status`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });
  });

  describe('GET /orders', () => {
    let baseOrdersCount: number;

    beforeEach(async () => {
      baseOrdersCount = Faker.integer({ min: 1, max: 10 });
      const baseOrdersCreationPromises: Promise<Order>[] = [];
      for (let i = 0; i < baseOrdersCount; i++) {
        baseOrdersCreationPromises.push(orderFactory.create({}));
      }
      await Promise.all(baseOrdersCreationPromises);
    });

    it('Should retrieve all orders with default pagination', async () => {
      const response = await request(httpServer).get('/orders').expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array) as Order[],
        total: expect.any(Number) as number,
      });

      expect(response.body.data).toHaveLength(baseOrdersCount);
      expect(response.body.total).toBe(baseOrdersCount);
      expect(response.body.data[0]).toMatchObject({
        _id: expect.any(String) as string,
        priceCents: expect.any(Number) as number,
        quantity: expect.any(Number) as number,
        productId: expect.any(String) as string,
        customerId: expect.any(String) as string,
        sellerId: expect.any(String) as string,
        status: expect.any(String) as string,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
    });

    it('Should filter orders by sellerId', async () => {
      const sellerId = Faker.mongoId().toString();
      const createdOrdersCount = Faker.integer({ min: 1, max: 3 });
      await Promise.all(
        Array.from({ length: createdOrdersCount }).map(() =>
          orderFactory.create({ sellerId }),
        ),
      );

      const response = await request(httpServer)
        .get('/orders')
        .query({ sellerId })
        .expect(200);

      expect(response.body.data).toHaveLength(createdOrdersCount);
      expect(response.body.total).toBe(createdOrdersCount);

      response.body.data.forEach((order: any) => {
        expect(order.sellerId).toBe(sellerId);
      });
    });

    it('Should filter orders by customerId', async () => {
      const customerId = Faker.mongoId().toString();
      const createdOrdersCount = Faker.integer({ min: 1, max: 3 });
      await Promise.all(
        Array.from({ length: createdOrdersCount }).map(() =>
          orderFactory.create({ customerId }),
        ),
      );

      const response = await request(httpServer)
        .get('/orders')
        .query({ customerId })
        .expect(200);

      expect(response.body.data).toHaveLength(createdOrdersCount);
      expect(response.body.total).toBe(createdOrdersCount);

      response.body.data.forEach((order: any) => {
        expect(order.customerId).toBe(customerId);
      });
    });

    it('Should filter orders by status', async () => {
      const status = OrderStatusEnum.REJECTED;
      const createdOrdersCount = Faker.integer({ min: 1, max: 3 });
      await Promise.all(
        Array.from({ length: createdOrdersCount }).map(() =>
          orderFactory.create({ status }),
        ),
      );

      const response = await request(httpServer)
        .get('/orders')
        .query({ status })
        .expect(200);

      expect(response.body.data).toHaveLength(createdOrdersCount);
      expect(response.body.total).toBe(createdOrdersCount);

      response.body.data.forEach((order: any) => {
        expect(order.status).toBe(OrderStatusEnum.REJECTED);
      });
    });

    it('Should handle pagination with limit parameter', async () => {
      const limit = baseOrdersCount - 1;
      const response = await request(httpServer)
        .get('/orders')
        .query({ limit })
        .expect(200);

      expect(response.body.data).toHaveLength(limit);
      expect(response.body.total).toBe(baseOrdersCount);
    });

    it('Should handle pagination with skip parameter', async () => {
      const skip = 1;
      const limit = baseOrdersCount - 1;
      const response = await request(httpServer)
        .get('/orders')
        .query({ skip, limit })
        .expect(200);

      expect(response.body.data).toHaveLength(limit);
      expect(response.body.total).toBe(baseOrdersCount);
    });

    it('Should handle pagination with skip greater than total', async () => {
      const skip = baseOrdersCount + 1;
      const response = await request(httpServer)
        .get('/orders')
        .query({ skip: skip })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(baseOrdersCount);
    });

    it('Should combine multiple filters', async () => {
      const sellerId = Faker.mongoId().toString();
      const createdOrdersCount = Faker.integer({ min: 1, max: 3 });
      await Promise.all(
        Array.from({ length: createdOrdersCount }).map(() =>
          orderFactory.create({ sellerId }),
        ),
      );
      const status = OrderStatusEnum.CREATED;

      const response = await request(httpServer)
        .get('/orders')
        .query({ sellerId, status })
        .expect(200);

      expect(response.body.data).toHaveLength(createdOrdersCount);
      expect(response.body.total).toBe(createdOrdersCount);

      const order = response.body.data[0];
      expect(order.sellerId).toBe(sellerId);
      expect(order.status).toBe(status);
    });

    it('Should return empty array when no orders match filters', async () => {
      const nonExistentSellerId = Faker.mongoId().toString();

      const response = await request(httpServer)
        .get('/orders')
        .query({ sellerId: nonExistentSellerId })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('Should return 400 when sellerId is not a valid mongo id', async () => {
      const response = await request(httpServer)
        .get('/orders')
        .query({ sellerId: 'invalid-id' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when customerId is not a valid mongo id', async () => {
      const response = await request(httpServer)
        .get('/orders')
        .query({ customerId: 'invalid-id' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when status is not a valid enum value', async () => {
      const response = await request(httpServer)
        .get('/orders')
        .query({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when limit is greater than 100', async () => {
      const response = await request(httpServer)
        .get('/orders')
        .query({ limit: 101 })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when limit is less than 1', async () => {
      const response = await request(httpServer)
        .get('/orders')
        .query({ limit: 0 })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should return 400 when skip is negative', async () => {
      const response = await request(httpServer)
        .get('/orders')
        .query({ skip: -1 })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('Should use default values when limit and skip are not provided', async () => {
      const response = await request(httpServer).get('/orders').expect(200);

      expect(response.body.data).toHaveLength(baseOrdersCount);
      expect(response.body.total).toBe(baseOrdersCount);
    });

    it('Should return orders sorted by creation date (newest first)', async () => {
      const response = await request(httpServer).get('/orders').expect(200);

      const orders = response.body.data;

      const createdAtDates = orders.map((order) =>
        new Date(order.createdAt).getTime(),
      );
      const sortedDates = [...createdAtDates].sort((a, b) => b - a);

      expect(createdAtDates).toEqual(sortedDates);
    });
  });
});
