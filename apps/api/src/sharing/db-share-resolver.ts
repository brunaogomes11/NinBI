import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm'
import type {
  DashboardShareResolver,
  ShareLevel,
} from '../dashboard-access/dashboard-share-resolver'
import { type AppDatabase, DB } from '../database/database.module'
import { dashboardShares, dashboards, teamMembers } from '../database/schema'

/** Implementação real do token `DASHBOARD_SHARE_RESOLVER`: direto, equipes do usuário e "todos". */
@Injectable()
export class DbShareResolver implements DashboardShareResolver {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async accessFor(
    userId: string,
    dashboardId: string,
  ): Promise<ShareLevel | null> {
    const [row] = await this.db
      .select({
        level: sql<
          number | null
        >`max(case ${dashboardShares.permission} when 'edit' then 2 else 1 end)`,
      })
      .from(dashboardShares)
      .where(
        and(eq(dashboardShares.dashboardId, dashboardId), this.reaches(userId)),
      )
    if (!row?.level) return null
    return row.level >= 2 ? 'edit' : 'view'
  }

  async sharedDashboardIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ id: dashboards.id, createdAt: dashboards.createdAt })
      .from(dashboardShares)
      .innerJoin(dashboards, eq(dashboards.id, dashboardShares.dashboardId))
      .where(and(this.reaches(userId), ne(dashboards.ownerId, userId)))
      .orderBy(asc(dashboards.createdAt), asc(dashboards.id))
    return rows.map((row) => row.id)
  }

  /** O compartilhamento alcança o usuário: com ele, com uma equipe dele ou com todos. */
  private reaches(userId: string) {
    return or(
      eq(dashboardShares.recipientType, 'EVERYONE'),
      eq(dashboardShares.userId, userId),
      inArray(
        dashboardShares.teamId,
        this.db
          .select({ teamId: teamMembers.teamId })
          .from(teamMembers)
          .where(eq(teamMembers.userId, userId)),
      ),
    )
  }
}
