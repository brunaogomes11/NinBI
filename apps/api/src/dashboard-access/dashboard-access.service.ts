import { Inject, Injectable } from '@nestjs/common'
import { can, MESSAGES } from '@ninbi/contracts'
import { asc, eq, inArray, or } from 'drizzle-orm'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { type AppDatabase, DB } from '../database/database.module'
import { dashboards } from '../database/schema'
import {
  DASHBOARD_SHARE_RESOLVER,
  type DashboardShareResolver,
} from './dashboard-share-resolver'

export interface DashboardAccess {
  dashboardId: string
  ownerId: string
  connectionId: string
  canView: true
  canEdit: boolean
  canDelete: boolean
}

export type DashboardNeed = 'view' | 'edit' | 'delete'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function dashboardNotFound(): AppError {
  return new AppError(404, 'DASHBOARD_NOT_FOUND', MESSAGES.dashboardNotFound)
}

@Injectable()
export class DashboardAccessService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(DASHBOARD_SHARE_RESOLVER)
    private readonly shares: DashboardShareResolver,
  ) {}

  /** Nulo quando o dashboard não existe ou o usuário não o alcança. */
  async find(
    user: SessionUser,
    dashboardId: string,
  ): Promise<DashboardAccess | null> {
    if (!UUID_PATTERN.test(dashboardId)) return null
    const [row] = await this.db
      .select({
        id: dashboards.id,
        ownerId: dashboards.ownerId,
        connectionId: dashboards.connectionId,
      })
      .from(dashboards)
      .where(eq(dashboards.id, dashboardId))
    if (!row) return null

    const base = {
      dashboardId: row.id,
      ownerId: row.ownerId,
      connectionId: row.connectionId,
      canView: true as const,
    }
    if (row.ownerId === user.id || can(user.role, 'dashboards.all')) {
      return { ...base, canEdit: true, canDelete: true }
    }
    const shared = await this.shares.accessFor(user.id, row.id)
    if (!shared) return null
    return { ...base, canEdit: shared === 'edit', canDelete: false }
  }

  async assert(
    user: SessionUser,
    dashboardId: string,
    need: DashboardNeed,
  ): Promise<DashboardAccess> {
    const access = await this.find(user, dashboardId)
    if (!access) throw dashboardNotFound()
    if (
      (need === 'edit' && !access.canEdit) ||
      (need === 'delete' && !access.canDelete)
    ) {
      throw new AppError(403, 'FORBIDDEN', MESSAGES.forbiddenRoute)
    }
    return access
  }

  /** Os dashboards do usuário e os compartilhados com ele, em ordem de criação. */
  async sidebarDashboardIds(user: SessionUser): Promise<string[]> {
    const shared = await this.shares.sharedDashboardIds(user.id)
    const mine = eq(dashboards.ownerId, user.id)
    const rows = await this.db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(shared.length ? or(mine, inArray(dashboards.id, shared)) : mine)
      .orderBy(asc(dashboards.createdAt), asc(dashboards.id))
    return rows.map((row) => row.id)
  }
}
