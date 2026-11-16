import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  type DashboardDto,
  type DashboardSummaryDto,
  MESSAGES,
} from '@ninbi/contracts'
import { asc, eq } from 'drizzle-orm'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import {
  type DashboardAccess,
  DashboardAccessService,
  dashboardNotFound,
} from '../dashboard-access/dashboard-access.service'
import { type AppDatabase, DB } from '../database/database.module'
import {
  connections,
  dashboards,
  dashboardTabs,
  users,
  widgets,
} from '../database/schema'

const DEFAULT_TAB_NAME = 'Aba 1'

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
  ) {}

  async create(
    user: SessionUser,
    input: { name: string; connectionId: string },
  ): Promise<DashboardDto> {
    const [connection] = await this.db
      .select({ id: connections.id })
      .from(connections)
      .where(eq(connections.id, input.connectionId))
    if (!connection) {
      throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
        connectionId: MESSAGES.connectionNotFound,
      })
    }
    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(dashboards)
        .values({
          name: input.name,
          ownerId: user.id,
          connectionId: input.connectionId,
        })
        .returning()
      if (!row) throw new Error('dashboard não inserido')
      await tx.insert(dashboardTabs).values({
        id: randomUUID(),
        dashboardId: row.id,
        name: DEFAULT_TAB_NAME,
        position: 0,
      })
      return row.id
    })
    return this.load(id, { canEdit: true, canDelete: true })
  }

  async get(user: SessionUser, dashboardId: string): Promise<DashboardDto> {
    const access = await this.access.assert(user, dashboardId, 'view')
    return this.load(access.dashboardId, access)
  }

  async listAll(): Promise<DashboardSummaryDto[]> {
    const rows = await this.db
      .select({
        id: dashboards.id,
        name: dashboards.name,
        ownerName: users.name,
        connectionName: connections.name,
        updatedAt: dashboards.updatedAt,
      })
      .from(dashboards)
      .innerJoin(users, eq(users.id, dashboards.ownerId))
      .innerJoin(connections, eq(connections.id, dashboards.connectionId))
    return rows
      .map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
      )
  }

  /** Monta o DTO; quem não edita não recebe o Cypher (AD-043). */
  private async load(
    dashboardId: string,
    permissions: Pick<DashboardAccess, 'canEdit' | 'canDelete'>,
  ): Promise<DashboardDto> {
    const [row] = await this.db
      .select({
        id: dashboards.id,
        name: dashboards.name,
        version: dashboards.version,
        updatedAt: dashboards.updatedAt,
        ownerId: dashboards.ownerId,
        ownerName: users.name,
        connectionId: dashboards.connectionId,
        connectionName: connections.name,
      })
      .from(dashboards)
      .innerJoin(users, eq(users.id, dashboards.ownerId))
      .innerJoin(connections, eq(connections.id, dashboards.connectionId))
      .where(eq(dashboards.id, dashboardId))
    if (!row) throw dashboardNotFound()

    const tabs = await this.db
      .select()
      .from(dashboardTabs)
      .where(eq(dashboardTabs.dashboardId, dashboardId))
      .orderBy(asc(dashboardTabs.position))
    const rows = await this.db
      .select()
      .from(widgets)
      .where(eq(widgets.dashboardId, dashboardId))
      .orderBy(asc(widgets.y), asc(widgets.x), asc(widgets.id))

    return {
      id: row.id,
      name: row.name,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      connectionId: row.connectionId,
      connectionName: row.connectionName,
      permissions: { edit: permissions.canEdit, delete: permissions.canDelete },
      tabs: tabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        widgets: rows
          .filter((widget) => widget.tabId === tab.id)
          .map((widget) => ({
            id: widget.id,
            title: widget.title,
            cypher: permissions.canEdit ? widget.cypher : null,
            hasQuery: widget.cypher !== null,
            visualization: widget.visualization,
            config: widget.config,
            layout: { x: widget.x, y: widget.y, w: widget.w, h: widget.h },
          })),
      })),
    }
  }
}
