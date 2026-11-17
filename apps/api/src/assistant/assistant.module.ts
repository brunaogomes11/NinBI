import { Module } from '@nestjs/common'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { AssistantController } from './assistant.controller'
import { AssistantHistoryService } from './assistant-history.service'

@Module({
  imports: [DashboardAccessModule],
  controllers: [AssistantController],
  providers: [AssistantHistoryService],
  exports: [AssistantHistoryService],
})
export class AssistantModule {}
