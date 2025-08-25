import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerConfig {
  title: string;
  description: string;
  version?: string;
  path?: string;
}

/**
 * Configures Swagger documentation for the application.
 * Sets up OpenAPI documentation with configurable information about the API.
 */
export const addSwagger =
  (config: SwaggerConfig) =>
  (app: INestApplication): void => {
    // Create Swagger configuration
    const documentConfig = new DocumentBuilder()
      .setTitle(config.title)
      .setDescription(config.description)
      .setVersion(config.version || '1.0')
      .build();

    // Generate OpenAPI specification document
    const document = SwaggerModule.createDocument(app, documentConfig);

    // Set up Swagger UI at the specified endpoint
    SwaggerModule.setup(config.path || 'docs', app, document);
  };
