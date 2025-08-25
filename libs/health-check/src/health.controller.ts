import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  check() {
    return this.health.check([]);
  }
}
