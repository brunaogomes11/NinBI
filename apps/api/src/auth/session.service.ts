import { createHash, randomBytes } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import type { Role } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { Clock } from '../common/clock'
import { type AppDatabase, DB } from '../database/database.module'
import { sessions, users } from '../database/schema'

export const SESSION_IDLE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  mustChangePassword: boolean
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async create(userId: string): Promise<{ token: string }> {
    const token = randomBytes(32).toString('base64url')
    const now = this.clock.now()
    await this.db.insert(sessions).values({
      tokenHash: hashToken(token),
      userId,
      createdAt: now,
      lastUsedAt: now,
    })
    return { token }
  }

  /** Devolve o usuário da sessão e renova o prazo; nulo quando a sessão não vale. */
  async resolve(token: string): Promise<SessionUser | null> {
    const tokenHash = hashToken(token)
    const [row] = await this.db
      .select({
        lastUsedAt: sessions.lastUsedAt,
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenHash, tokenHash))
    if (row?.status !== 'ACTIVE') return null

    const now = this.clock.now()
    if (now.getTime() - row.lastUsedAt.getTime() > SESSION_IDLE_LIMIT_MS) {
      return null
    }
    await this.db
      .update(sessions)
      .set({ lastUsedAt: now })
      .where(eq(sessions.tokenHash, tokenHash))
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      mustChangePassword: row.mustChangePassword,
    }
  }

  async revoke(token: string): Promise<void> {
    await this.db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)))
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId))
  }
}
