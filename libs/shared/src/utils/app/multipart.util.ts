import { NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

export const addMultipart = async (
  app: NestFastifyApplication,
): Promise<void> => {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });
};
