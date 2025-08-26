import { NestFactory } from '@nestjs/core';
import { InvoiceModule } from './invoice.module';
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
  addMultipart,
  addValidationPipe,
} from '@app/shared';
import { MicroserviceOptions } from '@nestjs/microservices';

const middlewares: AppMiddlewareInterface[] = [
  addSwagger,
  addMultipart,
  addValidationPipe,
];

export const buildApp = async (app: INestApplication) => {
  await applyMiddlewares(app, middlewares);
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    InvoiceModule,
    new FastifyAdapter({ logger: true }),
  );
  await buildApp(app);

  const configService = app.get<ConfigService>(ConfigService);

  app.connectMicroservice<MicroserviceOptions>(
    configService.get('orderStatusQueue') as MicroserviceOptions,
  );
  await app.startAllMicroservices();

  await app.listen({
    port: configService.get('PORT') ?? 3000,
    host: configService.get('HOST') ?? '0.0.0.0',
  });
}

bootstrap();
