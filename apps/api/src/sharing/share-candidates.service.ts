import { Inject, Injectable } from '@nestjs/common'
import type { ShareCandidatesDto } from '@ninbi/contracts'
import { and, asc, eq, ne, or, sql } from 'drizzle-orm'
import type { SessionUser } from '../auth/session.service'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { type AppDatabase, DB } from '../database/database.module'
import { teams, users } from '../database/schema'

const LIMIT = 20

/** `%`, `_` e `\` da busca valem como texto, não como curinga do ILIKE. */
function containsPattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

@Injectable()
export class ShareCandidatesService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
  ) {}

  async search(
    user: SessionUser,
    dashboardId: string,
    q: string,
  ): Promise<ShareCandidatesDto> {
    const access = await this.access.assert(user, dashboardId, 'share')
    const pattern = containsPattern(q.trim())
    const foundUsers = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'ACTIVE'),
          ne(users.id, access.ownerId),
          or(
            sql`${users.name} ILIKE ${pattern}`,
            sql`${users.email} ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(asc(sql`lower(${users.name})`), asc(users.name), asc(users.id))
      .limit(LIMIT)
    const foundTeams = await this.db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(sql`${teams.name} ILIKE ${pattern}`)
      .orderBy(asc(sql`lower(${teams.name})`), asc(teams.name), asc(teams.id))
      .limit(LIMIT)
    return { everyone: true, teams: foundTeams, users: foundUsers }
  }
}
