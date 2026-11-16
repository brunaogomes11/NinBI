import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ClockModule } from './common/clock'
import { CryptoModule } from './crypto/crypto.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { SetupModule } from './setup/setup.module'
import { UsersModule } from './users/users.module'
import { WebModule } from './web/web.module'

@Module({
  imports: [
    AuthModule,
    ClockModule,
    CryptoModule,
    DatabaseModule,
    HealthModule,
    SetupModule,
    UsersModule,
    WebModule,
  ],
})
export class AppModule {}
