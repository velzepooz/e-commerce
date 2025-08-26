import { Module } from '@nestjs/common';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceModel, InvoiceSchema } from './models/invoice.model';
import { InvoiceRepository } from './repositories/invoice.repository';
import { S3Module } from '@app/s3';
import {
  OrderProjectionModel,
  OrderProjectionSchema,
} from './models/order-projection.model';
import { OrderProjectionRepository } from './repositories/order-projection.repository';
import { OrderStatusConsumerService } from './services/order-status-consumer.service';
import { OrderStatusConsumerController } from './controllers/order-status.controller';
import { OrderProjectionService } from './services/order-projection.service';
import { getConfigModuleOptions } from '@app/shared';
import swaggerConfig from './config/swagger.config';
import validationPipeConfig from './config/validation-pipe.config';
import orderStatusQueueConfig from './config/order-status-queue.config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';

const SERVICE_NAME = 'invoice-service';

@Module({
  imports: [
    ConfigModule.forRoot({
      ...getConfigModuleOptions(SERVICE_NAME),
      load: [swaggerConfig, validationPipeConfig, orderStatusQueueConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
        dbName: configService.get<string>('DB_NAME'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: InvoiceModel.name, schema: InvoiceSchema },
      { name: OrderProjectionModel.name, schema: OrderProjectionSchema },
    ]),
    S3Module,
    TerminusModule,
  ],
  controllers: [
    InvoiceController,
    OrderStatusConsumerController,
    HealthController,
  ],
  providers: [
    InvoiceService,
    InvoiceRepository,
    OrderProjectionRepository,
    OrderStatusConsumerService,
    OrderProjectionService,
  ],
})
export class InvoiceModule {}
