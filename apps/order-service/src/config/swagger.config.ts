import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  title: 'Order Service',
  description: 'Order Service API for the marketplace platform',
  version: '1.0',
  path: 'orders/docs',
}));
