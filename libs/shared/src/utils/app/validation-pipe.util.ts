import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';

/**
 * Adds a validation pipe to the application. To customize the validation pipe, create a validationPipe config in the app module and pass it ConfigModule.forRoot().
 * @param app - The NestFastifyApplication instance.
 * @throws {Error} If ConfigService is not provided.
 */
export const addValidationPipe = (app: NestFastifyApplication): void => {
  const configService = app.get<ConfigService>(ConfigService);
  if (!configService) {
    throw new Error(
      'ConfigService must be provided for addValidationPipe middleware',
    );
  }

  app.useGlobalPipes(
    new ValidationPipe(configService.get('validationPipe') ?? {}),
  );
};
