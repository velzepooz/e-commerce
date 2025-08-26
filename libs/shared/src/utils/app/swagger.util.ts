import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerConfig {
  title: string;
  description: string;
  version?: string;
  path?: string;
}

/**
 * Configures Swagger documentation for the application. To customize the swagger config, create a swagger config in the app module and pass it ConfigModule.forRoot().
 * Sets up OpenAPI documentation with configurable information about the API.
 */
export const addSwagger = (app: INestApplication): void => {
  const configService = app.get<ConfigService>(ConfigService);
  if (!configService) {
    throw new Error('ConfigService must be provided for addSwagger middleware');
  }

  const documentConfig = new DocumentBuilder()
    .setTitle(configService.get('swagger.title') || 'API Documentation')
    .setDescription(
      configService.get('swagger.description') || 'API Documentation',
    )
    .setVersion(configService.get('swagger.version') || '1.0')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);

  SwaggerModule.setup(
    configService.get('swagger.path') || 'docs',
    app,
    document,
  );
};
