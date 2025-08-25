import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  providers: [HealthController],
  exports: [HealthController],
})
export class HealthCheckModule {}
