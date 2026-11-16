import { Module } from '@nestjs/common'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { QueriesModule } from '../queries/queries.module'
import { FilterOptionsController } from './filter-options.controller'

@Module({
  imports: [DashboardAccessModule, QueriesModule],
  controllers: [FilterOptionsController],
})
export class FiltersModule {}
