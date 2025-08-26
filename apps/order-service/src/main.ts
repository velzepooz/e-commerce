import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  addSwagger,
  applyMiddlewares,
  AppMiddlewareInterface,
} from '@app/shared';
import { addValidationPipe } from '@app/shared';

const middlewares: AppMiddlewareInterface[] = [addSwagger, addValidationPipe];

export const buildApp = async (app: INestApplication) => {
  await applyMiddlewares(app, middlewares);
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    OrderModule,
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
