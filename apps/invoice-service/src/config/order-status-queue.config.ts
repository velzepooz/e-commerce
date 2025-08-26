import { registerAs } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ORDER_STATUS_QUEUE } from '@app/shared';

export default registerAs('orderStatusQueue', () => ({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672'],
    queue: ORDER_STATUS_QUEUE,
    queueOptions: {
      durable: true,
    },
    prefetchCount: process.env.RABBIT_PREFETCH || 50,
  },
}));
