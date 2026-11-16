import { Module } from '@nestjs/common'
import { AiModule } from './ai/ai.module'
import { AuthModule } from './auth/auth.module'
import { ClockModule } from './common/clock'
import { ConnectionsModule } from './connections/connections.module'
import { CryptoModule } from './crypto/crypto.module'
import { DashboardAccessModule } from './dashboard-access/dashboard-access.module'
import { DashboardsModule } from './dashboards/dashboards.module'
import { DatabaseModule } from './database/database.module'
import { FiltersModule } from './filters/filters.module'
import { HealthModule } from './health/health.module'
import { LlmModule } from './llm/llm.module'
import { MapConfigModule } from './map-config/map-config.module'
import { Neo4jModule } from './neo4j/neo4j.module'
import { QueriesModule } from './queries/queries.module'
import { SchemaModule } from './schema/schema.module'
import { SetupModule } from './setup/setup.module'
import { SharingModule } from './sharing/sharing.module'
import { SidebarModule } from './sidebar/sidebar.module'
import { TeamsModule } from './teams/teams.module'
import { UsersModule } from './users/users.module'
import { WebModule } from './web/web.module'

@Module({
  imports: [
    AiModule,
    AuthModule,
    ClockModule,
    ConnectionsModule,
    CryptoModule,
    DashboardAccessModule,
    DashboardsModule,
    DatabaseModule,
    FiltersModule,
    HealthModule,
    LlmModule,
    MapConfigModule,
    Neo4jModule,
    QueriesModule,
    SchemaModule,
    SetupModule,
    SharingModule,
    SidebarModule,
    TeamsModule,
    UsersModule,
    WebModule,
  ],
})
export class AppModule {}
