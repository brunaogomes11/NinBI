import { Module } from '@nestjs/common'
import { ClockModule } from './common/clock'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [ClockModule, DatabaseModule, HealthModule],
})
export class AppModule {}
