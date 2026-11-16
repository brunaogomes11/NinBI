import { Module } from '@nestjs/common'
import { DashboardAccessModule } from '../dashboard-access/dashboard-access.module'
import { SharesController } from './shares.controller'
import { SharesService } from './shares.service'

@Module({
  imports: [DashboardAccessModule],
  controllers: [SharesController],
  providers: [SharesService],
})
export class SharingModule {}
