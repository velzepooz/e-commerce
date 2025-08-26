import { registerAs } from '@nestjs/config';

export default registerAs('validation', () => ({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  skipMissingProperties: false,
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
