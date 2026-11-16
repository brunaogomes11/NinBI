import { Inject, Injectable } from '@nestjs/common'
import { MESSAGES, type NewUserInput, type UserDto } from '@ninbi/contracts'
import { sql } from 'drizzle-orm'
import { PasswordHasher } from '../auth/password-hasher'
import { AppError } from '../common/app-error'
import { type AppDatabase, DB } from '../database/database.module'
import { type User, users } from '../database/schema'

const UNIQUE_VIOLATION = '23505'

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
}
