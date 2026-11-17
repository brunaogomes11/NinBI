import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { QueriesModule } from '../queries/queries.module'
import { SchemaModule } from '../schema/schema.module'
import { AssistantController } from './assistant.controller'
import { AssistantService } from './assistant.service'
import { AssistantHistoryService } from './assistant-history.service'

@Module({
  imports: [DashboardAccessModule, AiModule, QueriesModule, SchemaModule],
  controllers: [AssistantController],
  providers: [AssistantHistoryService, AssistantService],
  exports: [AssistantHistoryService, AssistantService],
})
export class AssistantModule {}
