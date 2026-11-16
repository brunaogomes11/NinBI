import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ClockModule } from './common/clock'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [AuthModule, ClockModule, DatabaseModule, HealthModule],
})
export class AppModule {}
