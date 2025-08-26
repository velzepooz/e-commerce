import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@Controller('healthz')
export class HealthController {
  constructor(
    private readonly _healthCheckService: HealthCheckService,
    private readonly _mongooseHealthIndicator: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this._healthCheckService.check([
      () => this._mongooseHealthIndicator.pingCheck('db'),
    ]);
  }
}
