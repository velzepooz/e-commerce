import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  title: 'Invoice Service',
  description: 'Invoice Service API for the marketplace platform',
  version: '1.0',
  path: 'invoices/docs',
}));
