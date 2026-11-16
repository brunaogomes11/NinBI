import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { ClockModule } from './common/clock'
import { CryptoModule } from './crypto/crypto.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { Neo4jModule } from './neo4j/neo4j.module'
import { SchemaModule } from './schema/schema.module'
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
    Neo4jModule,
    SchemaModule,
    SetupModule,
    UsersModule,
    WebModule,
  ],
})
export class AppModule {}
