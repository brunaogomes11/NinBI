import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { Clock } from '../common/clock'
import { type AppDatabase, DB } from '../database/database.module'
import { loginThrottle } from '../database/schema'

export const THROTTLE_WINDOW_MS = 15 * 60 * 1000
export const THROTTLE_MAX_FAILURES = 5

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

@Injectable()
export class LoginThrottleService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async isLocked(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ lockedUntil: loginThrottle.lockedUntil })
      .from(loginThrottle)
      .where(eq(loginThrottle.email, normalize(email)))
    return row?.lockedUntil != null && row.lockedUntil > this.clock.now()
  }

  /** A 5ª falha dentro de 15 minutos da primeira bloqueia o e-mail por 15 minutos. */
  async registerFailure(email: string): Promise<void> {
    const key = normalize(email)
    const now = this.clock.now()
    const [row] = await this.db
      .select()
      .from(loginThrottle)
      .where(eq(loginThrottle.email, key))

    const windowExpired =
      !row ||
      now.getTime() - row.windowStartedAt.getTime() >= THROTTLE_WINDOW_MS
    const failedCount = windowExpired ? 1 : row.failedCount + 1

    if (failedCount >= THROTTLE_MAX_FAILURES) {
      const lockedUntil = new Date(now.getTime() + THROTTLE_WINDOW_MS)
      await this.save(key, {
        failedCount: 0,
        windowStartedAt: now,
        lockedUntil,
      })
      return
    }
    await this.save(key, {
      failedCount,
      windowStartedAt: windowExpired ? now : (row?.windowStartedAt ?? now),
      lockedUntil: windowExpired ? null : (row?.lockedUntil ?? null),
    })
  }

  async reset(email: string): Promise<void> {
    await this.db
      .delete(loginThrottle)
      .where(eq(loginThrottle.email, normalize(email)))
  }

  private async save(
    email: string,
    values: {
      failedCount: number
      windowStartedAt: Date
      lockedUntil: Date | null
    },
  ): Promise<void> {
    await this.db
      .insert(loginThrottle)
      .values({ email, ...values })
      .onConflictDoUpdate({ target: loginThrottle.email, set: values })
  }
}
