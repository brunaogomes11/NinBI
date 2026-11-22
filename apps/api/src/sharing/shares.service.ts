import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  type DashboardSharesDto,
  MESSAGES,
  type ShareDto,
  type SharePermission,
  type ShareUpsertInput,
} from '@ninbi/contracts'
import { and, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { Clock } from '../common/clock'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { type AppDatabase, DB } from '../database/database.module'
import type * as schema from '../database/schema'
import { dashboardShares, teams, users } from '../database/schema'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function shareNotFound(): AppError {
  return new AppError(404, 'SHARE_NOT_FOUND', MESSAGES.shareNotFound)
}

function badRecipient(message: string): AppError {
  return new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
    recipient: message,
  })
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })

@Injectable()
export class SharesService {
  private readonly logger = new Logger('Share')

  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
  ) {}

  async list(
    user: SessionUser,
    dashboardId: string,
  ): Promise<DashboardSharesDto> {
    const access = await this.access.assert(user, dashboardId, 'share')
    return this.load(access.dashboardId, access.ownerId)
  }

  async upsert(
    user: SessionUser,
    dashboardId: string,
    input: ShareUpsertInput,
  ): Promise<DashboardSharesDto> {
    const access = await this.access.assert(user, dashboardId, 'share')
    const { recipient, permission } = input
    let recipientKey: string
    let userId: string | null = null
    let teamId: string | null = null
    if (recipient.type === 'USER') {
      await this.assertUserRecipient(
        recipient.userId,
        access.ownerId,
        permission,
      )
      userId = recipient.userId
      recipientKey = `user:${recipient.userId}`
    } else if (recipient.type === 'TEAM') {
      const [team] = await this.db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.id, recipient.teamId))
      if (!team) throw badRecipient(MESSAGES.teamNotFound)
      teamId = recipient.teamId
      recipientKey = `team:${recipient.teamId}`
    } else {
      recipientKey = 'everyone'
    }

    // A união NodePg | PGlite não aceita `.returning({...})`; os dois têm a mesma API.
    const db = this.db as NodePgDatabase<typeof schema>
    const [written] = await db
      .insert(dashboardShares)
      .values({
        dashboardId: access.dashboardId,
        recipientType: recipient.type,
        userId,
        teamId,
        recipientKey,
        permission,
        createdBy: user.id,
      })
      .onConflictDoUpdate({
        target: [dashboardShares.dashboardId, dashboardShares.recipientKey],
        set: { permission, updatedAt: this.clock.now() },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)`.as('inserted') })
    this.record(
      written?.inserted ? 'created' : 'updated',
      user.id,
      access.dashboardId,
      recipientKey,
      permission,
    )
    return this.load(access.dashboardId, access.ownerId)
  }

  async change(
    user: SessionUser,
    dashboardId: string,
    shareId: string,
    permission: SharePermission,
  ): Promise<DashboardSharesDto> {
    const access = await this.access.assert(user, dashboardId, 'share')
    const share = await this.findShare(access.dashboardId, shareId)
    if (share.userId) {
      await this.assertUserRecipient(share.userId, access.ownerId, permission)
    }
    await this.db
      .update(dashboardShares)
      .set({ permission, updatedAt: this.clock.now() })
      .where(eq(dashboardShares.id, share.id))
    this.record(
      'updated',
      user.id,
      access.dashboardId,
      share.recipientKey,
      permission,
    )
    return this.load(access.dashboardId, access.ownerId)
  }

  async remove(
    user: SessionUser,
    dashboardId: string,
    shareId: string,
  ): Promise<DashboardSharesDto> {
    const access = await this.access.assert(user, dashboardId, 'share')
    const share = await this.findShare(access.dashboardId, shareId)
    await this.db
      .delete(dashboardShares)
      .where(eq(dashboardShares.id, share.id))
    this.record(
      'removed',
      user.id,
      access.dashboardId,
      share.recipientKey,
      share.permission,
    )
    return this.load(access.dashboardId, access.ownerId)
  }

  /** Dono, usuário inexistente ou desativado e Visualizador com "Pode editar" são recusados. */
  private async assertUserRecipient(
    userId: string,
    ownerId: string,
    permission: SharePermission,
  ): Promise<void> {
    if (userId === ownerId) {
      throw badRecipient(MESSAGES.shareOwnerAlreadyHasAccess)
    }
    const [target] = await this.db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
    if (target?.status !== 'ACTIVE') {
      throw badRecipient(MESSAGES.userNotFound)
    }
    if (target.role === 'VIEWER' && permission === 'edit') {
      throw badRecipient(MESSAGES.shareViewerCannotEdit)
    }
  }

  private async findShare(dashboardId: string, shareId: string) {
    if (!UUID_PATTERN.test(shareId)) throw shareNotFound()
    const [share] = await this.db
      .select()
      .from(dashboardShares)
      .where(
        and(
          eq(dashboardShares.id, shareId),
          eq(dashboardShares.dashboardId, dashboardId),
        ),
      )
    if (!share) throw shareNotFound()
    return share
  }

  private record(
    action: 'created' | 'updated' | 'removed',
    actorId: string,
    dashboardId: string,
    recipientKey: string,
    permission: SharePermission,
  ): void {
    this.logger.log(
      `share action=${action} by=${actorId} dashboard=${dashboardId} recipient=${recipientKey} permission=${permission}`,
    )
  }

  private async load(
    dashboardId: string,
    ownerId: string,
  ): Promise<DashboardSharesDto> {
    const [owner] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, ownerId))
    const rows = await this.db
      .select({
        id: dashboardShares.id,
        type: dashboardShares.recipientType,
        permission: dashboardShares.permission,
        userId: dashboardShares.userId,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        userStatus: users.status,
        teamId: dashboardShares.teamId,
        teamName: teams.name,
      })
      .from(dashboardShares)
      .leftJoin(users, eq(users.id, dashboardShares.userId))
      .leftJoin(teams, eq(teams.id, dashboardShares.teamId))
      .where(eq(dashboardShares.dashboardId, dashboardId))

    const rank = { EVERYONE: 0, TEAM: 1, USER: 2 } as const
    const shares = rows
      .map((row) => ({
        sortName: row.userName ?? row.teamName ?? '',
        dto: toShareDto(row),
      }))
      .sort(
        (a, b) =>
          rank[a.dto.recipient.type] - rank[b.dto.recipient.type] ||
          byName(a.sortName, b.sortName),
      )
      .map((entry) => entry.dto)
    return {
      dashboardId,
      ownerId,
      ownerName: owner?.name ?? '',
      shares,
    }
  }
}

interface ShareRow {
  id: string
  type: 'USER' | 'TEAM' | 'EVERYONE'
  permission: SharePermission
  userId: string | null
  userName: string | null
  userEmail: string | null
  userRole: 'ADMIN' | 'EDITOR' | 'VIEWER' | null
  userStatus: (typeof users.$inferSelect)['status'] | null
  teamId: string | null
  teamName: string | null
}

function toShareDto(row: ShareRow): ShareDto {
  if (row.type === 'USER' && row.userId && row.userRole) {
    return {
      id: row.id,
      permission: row.permission,
      recipient: {
        type: 'USER',
        id: row.userId,
        name: row.userName ?? '',
        email: row.userEmail ?? '',
        role: row.userRole,
        disabled: row.userStatus !== 'ACTIVE',
      },
    }
  }
  if (row.type === 'TEAM' && row.teamId) {
    return {
      id: row.id,
      permission: row.permission,
      recipient: { type: 'TEAM', id: row.teamId, name: row.teamName ?? '' },
    }
  }
  return {
    id: row.id,
    permission: row.permission,
    recipient: { type: 'EVERYONE' },
  }
}
