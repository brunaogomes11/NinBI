import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import {
  type DashboardDto,
  type DashboardSaveInput,
  type DashboardSummaryDto,
  MESSAGES,
} from '@ninbi/contracts'
import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { Clock } from '../common/clock'
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

/** Ids de aba ou widget repetidos, ou que já pertencem a outro dashboard. */
function invalidIds(): AppError {
  return new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
    tabs: MESSAGES.validationError,
  })
}

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async create(
    user: SessionUser,
    input: { name: string; connectionId: string },
  ): Promise<DashboardDto> {
    await this.assertConnectionExists(input.connectionId)
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
    return this.load(id, { canEdit: true, canDelete: true, canShare: true })
  }

  async get(user: SessionUser, dashboardId: string): Promise<DashboardDto> {
    const access = await this.access.assert(user, dashboardId, 'view')
    return this.load(access.dashboardId, access)
  }

  async save(
    user: SessionUser,
    dashboardId: string,
    input: DashboardSaveInput,
  ): Promise<DashboardDto> {
    const access = await this.access.assert(user, dashboardId, 'edit')
    await this.assertConnectionExists(input.connectionId)

    await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(dashboards)
        .set({
          name: input.name,
          connectionId: input.connectionId,
          version: input.version + 1,
          updatedAt: this.clock.now(),
        })
        .where(
          and(
            eq(dashboards.id, access.dashboardId),
            eq(dashboards.version, input.version),
          ),
        )
        .returning()
      if (!updated) {
        const [still] = await tx
          .select({ id: dashboards.id })
          .from(dashboards)
          .where(eq(dashboards.id, access.dashboardId))
        throw still
          ? new AppError(
              409,
              'DASHBOARD_VERSION_CONFLICT',
              MESSAGES.dashboardVersionConflict,
            )
          : dashboardNotFound()
      }

      const tabIds = input.tabs.map((tab) => tab.id)
      const widgetIds = input.tabs.flatMap((tab) =>
        tab.widgets.map((widget) => widget.id),
      )
      if (
        new Set(tabIds).size !== tabIds.length ||
        new Set(widgetIds).size !== widgetIds.length
      ) {
        throw invalidIds()
      }
      const foreignTabs = await tx
        .select({ id: dashboardTabs.id })
        .from(dashboardTabs)
        .where(
          and(
            inArray(dashboardTabs.id, tabIds),
            ne(dashboardTabs.dashboardId, access.dashboardId),
          ),
        )
      const foreignWidgets = widgetIds.length
        ? await tx
            .select({ id: widgets.id })
            .from(widgets)
            .where(
              and(
                inArray(widgets.id, widgetIds),
                ne(widgets.dashboardId, access.dashboardId),
              ),
            )
        : []
      if (foreignTabs.length || foreignWidgets.length) throw invalidIds()

      await tx
        .delete(dashboardTabs)
        .where(eq(dashboardTabs.dashboardId, access.dashboardId))
      await tx.insert(dashboardTabs).values(
        input.tabs.map((tab, position) => ({
          id: tab.id,
          dashboardId: access.dashboardId,
          name: tab.name,
          position,
        })),
      )
      const widgetRows = input.tabs.flatMap((tab) =>
        tab.widgets.map((widget) => ({
          id: widget.id,
          dashboardId: access.dashboardId,
          tabId: tab.id,
          title: widget.title,
          cypher: widget.cypher,
          visualization: widget.visualization,
          config: widget.config,
          ...widget.layout,
        })),
      )
      if (widgetRows.length) await tx.insert(widgets).values(widgetRows)
    })
    return this.load(access.dashboardId, access)
  }

  async remove(user: SessionUser, dashboardId: string): Promise<void> {
    const access = await this.access.assert(user, dashboardId, 'delete')
    await this.db
      .delete(dashboards)
      .where(eq(dashboards.id, access.dashboardId))
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

  private async assertConnectionExists(connectionId: string): Promise<void> {
    const [connection] = await this.db
      .select({ id: connections.id })
      .from(connections)
      .where(eq(connections.id, connectionId))
    if (!connection) {
      throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
        connectionId: MESSAGES.connectionNotFound,
      })
    }
  }

  /** Monta o DTO; quem não edita não recebe o Cypher (AD-043). */
  private async load(
    dashboardId: string,
    permissions: Pick<DashboardAccess, 'canEdit' | 'canDelete' | 'canShare'>,
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
      permissions: {
        edit: permissions.canEdit,
        delete: permissions.canDelete,
        share: permissions.canShare,
      },
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
