import { Inject, Injectable } from '@nestjs/common'
import type {
  SidebarDashboardNode,
  SidebarDto,
  SidebarGroupNode,
  SidebarLayoutInput,
} from '@ninbi/contracts'
import { eq, inArray } from 'drizzle-orm'
import type { SessionUser } from '../auth/session.service'
import { Clock } from '../common/clock'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { type AppDatabase, DB } from '../database/database.module'
import { dashboards, sidebarLayouts } from '../database/schema'

const EMPTY_LAYOUT: SidebarLayoutInput = { items: [] }

@Injectable()
export class SidebarService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
  ) {}

  async get(user: SessionUser): Promise<SidebarDto> {
    const [row] = await this.db
      .select()
      .from(sidebarLayouts)
      .where(eq(sidebarLayouts.userId, user.id))
    return this.assemble(user, row?.layout ?? EMPTY_LAYOUT)
  }

  /** Substitui o documento do usuário; a última gravação vale (SIDE-17). */
  async save(
    user: SessionUser,
    layout: SidebarLayoutInput,
  ): Promise<SidebarDto> {
    const reachable = new Set(await this.access.sidebarDashboardIds(user))
    const kept: SidebarLayoutInput = {
      items: layout.items.flatMap((item): SidebarLayoutInput['items'] => {
        if (item.type === 'dashboard') {
          return reachable.has(item.id) ? [item] : []
        }
        return [
          {
            ...item,
            items: item.items.filter((child) => reachable.has(child.id)),
          },
        ]
      }),
    }
    const updatedAt = this.clock.now()
    await this.db
      .insert(sidebarLayouts)
      .values({ userId: user.id, layout: kept, updatedAt })
      .onConflictDoUpdate({
        target: sidebarLayouts.userId,
        set: { layout: kept, updatedAt },
      })
    return this.assemble(user, kept)
  }

  /**
   * Cruza o documento gravado com o que o usuário alcança hoje: tira os que sumiram,
   * acrescenta no fim, soltos, os que faltam, e põe o nome atual (AD-042).
   */
  private async assemble(
    user: SessionUser,
    layout: SidebarLayoutInput,
  ): Promise<SidebarDto> {
    const reachableIds = await this.access.sidebarDashboardIds(user)
    const names = new Map<string, string>()
    if (reachableIds.length) {
      const rows = await this.db
        .select({ id: dashboards.id, name: dashboards.name })
        .from(dashboards)
        .where(inArray(dashboards.id, reachableIds))
      for (const row of rows) names.set(row.id, row.name)
    }

    const placed = new Set<string>()
    const node = (id: string): SidebarDashboardNode[] => {
      const name = names.get(id)
      if (name === undefined || placed.has(id)) return []
      placed.add(id)
      return [{ type: 'dashboard', id, name }]
    }

    const items: SidebarDto['items'] = layout.items.flatMap(
      (item): SidebarDto['items'] => {
        if (item.type === 'dashboard') return node(item.id)
        const group: SidebarGroupNode = {
          type: 'group',
          id: item.id,
          name: item.name,
          items: item.items.flatMap((child) => node(child.id)),
        }
        return [group]
      },
    )
    for (const id of reachableIds) items.push(...node(id))
    return { items }
  }
}
