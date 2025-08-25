import { INestApplication } from '@nestjs/common';

export interface AppMiddlewareInterface {
  (app: INestApplication): void | Promise<void>;
}

export const applyMiddlewares = async (
  app: INestApplication,
  middlewares: AppMiddlewareInterface[],
): Promise<void> => {
  for (const middleware of middlewares) {
    await middleware(app);
  }
};
