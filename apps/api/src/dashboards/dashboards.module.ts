import { Module } from '@nestjs/common'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { DashboardsController } from './dashboards.controller'
import { DashboardsService } from './dashboards.service'

@Module({
  imports: [DashboardAccessModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
