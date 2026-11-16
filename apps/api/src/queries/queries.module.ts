import { Module } from '@nestjs/common'
import { loadQueryLimits } from '../config/env'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { QueriesController } from './queries.controller'
import { QUERY_MAX_ROWS, QUERY_TIMEOUT_MS, QueryService } from './query.service'

@Module({
  imports: [DashboardAccessModule],
  controllers: [QueriesController],
  providers: [
    QueryService,
    {
      provide: QUERY_TIMEOUT_MS,
      useFactory: () => loadQueryLimits().timeoutMs,
    },
    { provide: QUERY_MAX_ROWS, useFactory: () => loadQueryLimits().maxRows },
  ],
  exports: [QueryService],
})
export class QueriesModule {}
