import { Module } from '@nestjs/common'
import { DbShareResolver } from '../sharing/db-share-resolver'
import { DashboardAccessService } from './dashboard-access.service'
import { DASHBOARD_SHARE_RESOLVER } from './dashboard-share-resolver'

@Module({
  providers: [
    DashboardAccessService,
    { provide: DASHBOARD_SHARE_RESOLVER, useClass: DbShareResolver },
  ],
  exports: [DashboardAccessService],
})
export class DashboardAccessModule {}
