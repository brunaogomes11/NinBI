import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ClockModule } from './common/clock'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { SetupModule } from './setup/setup.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    AuthModule,
    ClockModule,
    DatabaseModule,
    HealthModule,
    SetupModule,
    UsersModule,
  ],
})
export class AppModule {}
