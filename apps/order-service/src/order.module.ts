import { Module } from '@nestjs/common';
import { OrderServiceController } from './controllers/order.controller';
import { OrderServiceService } from './services/order.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderRepository } from './repository/order.repository';
import { OrderModel, OrderSchema } from './models/order.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? 'apps/invoice-service/.test.env'
          : 'apps/invoice-service/.env',
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
  ],
  controllers: [OrderServiceController],
  providers: [OrderServiceService, OrderRepository],
})
export class OrderModule {}
