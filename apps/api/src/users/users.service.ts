import { Inject, Injectable } from '@nestjs/common'
import {
  MESSAGES,
  type NewUserInput,
  type Role,
  type UserDto,
} from '@ninbi/contracts'
import { and, eq, ne, sql } from 'drizzle-orm'
import { PasswordHasher } from '../auth/password-hasher'
import { SessionService } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { type AppDatabase, DB } from '../database/database.module'
import { type User, users } from '../database/schema'

const UNIQUE_VIOLATION = '23505'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function notFound(): AppError {
  return new AppError(404, 'NOT_FOUND', MESSAGES.userNotFound)
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  }
}

/** O driver (pg ou PGlite) pode embrulhar o erro original em `cause`. */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 3 && current; depth++) {
    if (
      typeof current === 'object' &&
      (current as { code?: unknown }).code === UNIQUE_VIOLATION
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async list(): Promise<UserDto[]> {
    const rows = await this.db
      .select()
      .from(users)
      .orderBy(sql`lower(${users.name})`, users.name)
    return rows.map(toUserDto)
  }

  async create(input: NewUserInput): Promise<UserDto> {
    const passwordHash = await this.hasher.hash(input.temporaryPassword)
    try {
      const [created] = await this.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          mustChangePassword: true,
        })
        .returning()
      if (!created) throw new Error('usuário não inserido')
      return toUserDto(created)
    } catch (error) {
      // O índice único em lower(email) decide a corrida entre dois cadastros iguais.
      if (isUniqueViolation(error)) {
        throw new AppError(409, 'EMAIL_TAKEN', MESSAGES.emailTaken)
      }
      throw error
    }
  }

  async changeRole(id: string, role: Role): Promise<UserDto> {
    const updated = await this.updateGuardingLastAdmin(
      id,
      { role },
      () => role !== 'ADMIN',
    )
    return toUserDto(updated)
  }

  async deactivate(id: string): Promise<UserDto> {
    const updated = await this.updateGuardingLastAdmin(
      id,
      { status: 'DISABLED' },
      () => true,
    )
    await this.sessions.revokeAllForUser(id)
    return toUserDto(updated)
  }

  async reactivate(id: string): Promise<UserDto> {
    if (!UUID_PATTERN.test(id)) throw notFound()
    const [updated] = await this.db
      .update(users)
      .set({ status: 'ACTIVE', updatedAt: sql`now()` })
      .where(and(eq(users.id, id), ne(users.status, 'PENDING')))
      .returning()
    if (!updated) {
      const [target] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id))
      if (!target) throw notFound()
      throw new AppError(
        409,
        'REGISTRATION_STATUS_CONFLICT',
        'Aprove o cadastro com uma senha provisória',
      )
    }
    return toUserDto(updated)
  }

  async approveRegistration(
    id: string,
    temporaryPassword: string,
  ): Promise<UserDto> {
    if (!UUID_PATTERN.test(id)) throw notFound()
    const passwordHash = await this.hasher.hash(temporaryPassword)
    const [updated] = await this.db
      .update(users)
      .set({
        status: 'ACTIVE',
        passwordHash,
        mustChangePassword: true,
        updatedAt: sql`now()`,
      })
      .where(and(eq(users.id, id), eq(users.status, 'PENDING')))
      .returning()
    if (!updated) {
      const [target] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id))
      if (!target) throw notFound()
      throw new AppError(
        409,
        'REGISTRATION_STATUS_CONFLICT',
        'O cadastro já foi aprovado',
      )
    }
    return toUserDto(updated)
  }

  /**
   * Aplica a mudança travando as linhas dos Admins ativos (`FOR UPDATE`): se ela
   * tirar um Admin ativo (`removesAdmin`) e ele for o último, recusa com 409.
   */
  private async updateGuardingLastAdmin(
    id: string,
    changes: Partial<Pick<User, 'role' | 'status'>>,
    removesAdmin: () => boolean,
  ): Promise<User> {
    if (!UUID_PATTERN.test(id)) throw notFound()
    return this.db.transaction(async (tx) => {
      const activeAdmins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'ADMIN'), eq(users.status, 'ACTIVE')))
        .for('update')
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .for('update')
      if (!target) throw notFound()
      if (target.status === 'PENDING') {
        throw new AppError(
          409,
          'REGISTRATION_STATUS_CONFLICT',
          'Aprove o cadastro com uma senha provisória',
        )
      }

      const isActiveAdmin = activeAdmins.some((admin) => admin.id === id)
      if (isActiveAdmin && removesAdmin() && activeAdmins.length <= 1) {
        throw new AppError(409, 'LAST_ADMIN', MESSAGES.lastAdmin)
      }
      const [updated] = await tx
        .update(users)
        .set({ ...changes, updatedAt: sql`now()` })
        .where(eq(users.id, id))
        .returning()
      if (!updated) throw notFound()
      return updated
    })
  }

  async resetPassword(id: string, temporaryPassword: string): Promise<void> {
    if (!UUID_PATTERN.test(id)) throw notFound()
    const passwordHash = await this.hasher.hash(temporaryPassword)
    const [updated] = await this.db
      .update(users)
      .set({ passwordHash, mustChangePassword: true, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning()
    if (!updated) throw notFound()
    await this.sessions.revokeAllForUser(id)
  }
}
