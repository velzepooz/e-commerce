import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  addSwagger,
  applyMiddlewares,
  AppMiddlewareInterface,
} from '@app/shared';

const middlewares: AppMiddlewareInterface[] = [
  addSwagger({
    title: 'Order Service',
    description: 'Order Service API for the marketplace platform',
    version: '1.0',
    path: 'orders/docs',
  }),
];

export const buildApp = async (app: INestApplication) => {
  await applyMiddlewares(app, middlewares);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
};
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    OrderServiceModule,
    new FastifyAdapter({ logger: true }),
  );
  await buildApp(app);

  const configService = app.get<ConfigService>(ConfigService);
  await app.listen({
    port: configService.get('PORT') ?? 3000,
    host: configService.get('HOST') ?? '0.0.0.0',
  });
}

bootstrap();
