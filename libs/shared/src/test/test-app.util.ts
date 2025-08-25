import {
  DynamicModule,
  INestApplication,
  Provider,
  Type,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { TestUtils } from './test.utils';

export class TestAppModuleClass {
  app: NestFastifyApplication;
  module: TestingModule;

  constructor(
    private readonly _appModule: DynamicModule | Type<any>,
    private readonly _testUtils: Provider<TestUtils>,
    private readonly _appFactory: (app: INestApplication) => Promise<void>,
  ) {}

  private async createAppModule(): Promise<void> {
    this.module = await Test.createTestingModule({
      imports: [this._appModule],
      providers: [this._testUtils],
    }).compile();
    this.app = this.module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await this._appFactory(this.app);
    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();
  }

  async getApp(): Promise<INestApplication> {
    if (this.app) return this.app;
    await this.createAppModule();

    return this.app;
  }

  async getAppModule(): Promise<TestingModule> {
    if (this.module) return this.module;
    await this.createAppModule();

    return this.module;
  }
}
