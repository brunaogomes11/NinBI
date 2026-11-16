import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  MESSAGES,
  type TeamCreateInput,
  type TeamDto,
  type TeamUpdateInput,
} from '@ninbi/contracts'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { Clock } from '../common/clock'
import { type AppDatabase, DB } from '../database/database.module'
import { isForeignKeyViolation, isUniqueViolation } from '../database/pg-errors'
import {
  dashboardShares,
  type TeamRow,
  teamMembers,
  teams,
  users,
} from '../database/schema'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function teamNotFound(): AppError {
  return new AppError(404, 'TEAM_NOT_FOUND', MESSAGES.teamNotFound)
}

function nameTaken(): AppError {
  return new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
    name: MESSAGES.teamNameTaken,
  })
}

function memberNotFound(): AppError {
  return new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
    memberIds: MESSAGES.userNotFound,
  })
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })

@Injectable()
export class TeamsService {
  private readonly logger = new Logger('Team')

  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async list(): Promise<TeamDto[]> {
    return this.load()
  }

  async create(input: TeamCreateInput): Promise<TeamDto> {
    const name = input.name.trim()
    await this.assertNameFree(name)
    await this.assertUsersExist(input.memberIds)
    try {
      const id = await this.db.transaction(async (tx) => {
        const [created] = await tx.insert(teams).values({ name }).returning()
        if (!created) throw new Error('equipe não inserida')
        if (input.memberIds.length > 0) {
          await tx
            .insert(teamMembers)
            .values(
              input.memberIds.map((userId) => ({ teamId: created.id, userId })),
            )
        }
        return created.id
      })
      return await this.loadOne(id)
    } catch (error) {
      throw this.translate(error)
    }
  }

  async update(id: string, input: TeamUpdateInput): Promise<TeamDto> {
    const team = await this.find(id)
    const name = input.name?.trim()
    if (name !== undefined) await this.assertNameFree(name, team.id)
    if (input.memberIds) await this.assertUsersExist(input.memberIds)
    const memberIds = input.memberIds
    try {
      await this.db.transaction(async (tx) => {
        await tx
          .update(teams)
          .set({
            ...(name !== undefined ? { name } : {}),
            updatedAt: this.clock.now(),
          })
          .where(eq(teams.id, team.id))
        if (memberIds) {
          await tx.delete(teamMembers).where(eq(teamMembers.teamId, team.id))
          if (memberIds.length > 0) {
            await tx
              .insert(teamMembers)
              .values(memberIds.map((userId) => ({ teamId: team.id, userId })))
          }
        }
      })
      return await this.loadOne(team.id)
    } catch (error) {
      throw this.translate(error)
    }
  }

  async remove(actorId: string, id: string): Promise<void> {
    const team = await this.find(id)
    const [counted] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(dashboardShares)
      .where(eq(dashboardShares.teamId, team.id))
    await this.db.delete(teams).where(eq(teams.id, team.id))
    this.logger.log(
      `team deleted by=${actorId} team=${team.id} shares=${counted?.count ?? 0}`,
    )
  }

  private async find(id: string): Promise<TeamRow> {
    if (!UUID_PATTERN.test(id)) throw teamNotFound()
    const [team] = await this.db.select().from(teams).where(eq(teams.id, id))
    if (!team) throw teamNotFound()
    return team
  }

  private async assertNameFree(name: string, exceptId?: string): Promise<void> {
    const sameName = sql`lower(${teams.name}) = lower(${name})`
    const [taken] = await this.db
      .select({ id: teams.id })
      .from(teams)
      .where(exceptId ? and(sameName, ne(teams.id, exceptId)) : sameName)
    if (taken) throw nameTaken()
  }

  private async assertUsersExist(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const found = await this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, ids))
    if (found.length !== new Set(ids).size) throw memberNotFound()
  }

  /** Violações de índice e de chave por corrida viram a mesma resposta 400. */
  private translate(error: unknown): unknown {
    if (isUniqueViolation(error)) return nameTaken()
    if (isForeignKeyViolation(error)) return memberNotFound()
    return error
  }

  private async loadOne(id: string): Promise<TeamDto> {
    const [team] = await this.load(id)
    if (!team) throw teamNotFound()
    return team
  }

  private async load(onlyId?: string): Promise<TeamDto[]> {
    const rows = await this.db
      .select()
      .from(teams)
      .where(onlyId ? eq(teams.id, onlyId) : undefined)
    if (rows.length === 0) return []
    const ids = rows.map((row) => row.id)
    const members = await this.db
      .select({
        teamId: teamMembers.teamId,
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(inArray(teamMembers.teamId, ids))
    const shareCounts = await this.db
      .select({
        teamId: dashboardShares.teamId,
        count: sql<number>`count(*)::int`,
      })
      .from(dashboardShares)
      .where(inArray(dashboardShares.teamId, ids))
      .groupBy(dashboardShares.teamId)
    const shareCountOf = new Map(
      shareCounts.map((row) => [row.teamId, row.count]),
    )
    return rows
      .map((row): TeamDto => {
        const own = members
          .filter((member) => member.teamId === row.id)
          .map(({ id: memberId, name, email }) => ({
            id: memberId,
            name,
            email,
          }))
          .sort(byName)
        return {
          id: row.id,
          name: row.name,
          memberCount: own.length,
          members: own,
          shareCount: shareCountOf.get(row.id) ?? 0,
        }
      })
      .sort(byName)
  }
}
