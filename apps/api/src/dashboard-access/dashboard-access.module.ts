import { Module } from '@nestjs/common'
import { DashboardAccessService } from './dashboard-access.service'
import {
  DASHBOARD_SHARE_RESOLVER,
  NoSharesResolver,
} from './dashboard-share-resolver'

@Module({
  providers: [
    DashboardAccessService,
    { provide: DASHBOARD_SHARE_RESOLVER, useClass: NoSharesResolver },
  ],
  exports: [DashboardAccessService],
})
export class DashboardAccessModule {}
