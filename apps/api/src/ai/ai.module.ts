import { Module } from '@nestjs/common'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { QueriesModule } from '../queries/queries.module'
import { SchemaModule } from '../schema/schema.module'
import { AiController } from './ai.controller'
import { AiWidgetService } from './ai-widget.service'

@Module({
  imports: [DashboardAccessModule, QueriesModule, SchemaModule],
  controllers: [AiController],
  providers: [AiWidgetService],
  exports: [AiWidgetService],
})
export class AiModule {}
