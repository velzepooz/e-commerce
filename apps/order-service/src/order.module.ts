import { Module } from '@nestjs/common';
import { OrderServiceController } from './controllers/order.controller';
import { OrderServiceService } from './services/order.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderRepository } from './repository/order.repository';
import { OrderModel, OrderSchema } from './models/order.model';
import {
  ORDER_EVENT_PUBLISHER_CLIENT,
  OrderStatusEventPublisherService,
} from './services/order-event-publisher.service';
import { ClientProvider, ClientsModule } from '@nestjs/microservices';
import validationPipeConfig from './config/validation-pipe.config';
import { getConfigModuleOptions } from '@app/shared';
import swaggerConfig from './config/swagger.config';
import orderStatusQueueConfig from './config/order-status-queue.config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';

const SERVICE_NAME = 'order-service';

@Module({
  imports: [
    ConfigModule.forRoot({
      ...getConfigModuleOptions(SERVICE_NAME),
      load: [validationPipeConfig, swaggerConfig, orderStatusQueueConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
        dbName: configService.get<string>('DB_NAME'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: OrderModel.name, schema: OrderSchema }]),
    ClientsModule.registerAsync([
      {
        name: ORDER_EVENT_PUBLISHER_CLIENT,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          configService.get('orderStatusQueue') as ClientProvider,
        inject: [ConfigService],
      },
    ]),
    TerminusModule,
  ],
  controllers: [OrderServiceController, HealthController],
  providers: [
    OrderServiceService,
    OrderRepository,
    OrderStatusEventPublisherService,
  ],
})
export class OrderModule {}
