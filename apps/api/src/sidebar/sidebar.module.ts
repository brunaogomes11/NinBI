import { Module } from '@nestjs/common'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { SidebarController } from './sidebar.controller'
import { SidebarService } from './sidebar.service'

@Module({
  imports: [DashboardAccessModule],
  controllers: [SidebarController],
  providers: [SidebarService],
})
export class SidebarModule {}
