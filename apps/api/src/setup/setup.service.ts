import { Inject, Injectable } from '@nestjs/common'
import {
  MESSAGES,
  type SessionUserDto,
  type SetupAdminInput,
} from '@ninbi/contracts'
import { count } from 'drizzle-orm'
import { PasswordHasher } from '../auth/password-hasher'
import { SessionService } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { Clock } from '../common/clock'
import { type AppDatabase, DB } from '../database/database.module'
import { installation, users } from '../database/schema'

@Injectable()
export class SetupService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async needsSetup(): Promise<boolean> {
    const [row] = await this.db.select({ total: count() }).from(users)
    return (row?.total ?? 0) === 0
  }

  async createAdmin(
    input: SetupAdminInput,
  ): Promise<{ user: SessionUserDto; token: string }> {
    const passwordHash = await this.hasher.hash(input.password)
    const alreadyDone = new AppError(
      409,
      'SETUP_ALREADY_DONE',
      MESSAGES.setupAlreadyDone,
    )

    // A chave primária de `installation` decide a corrida: só um envio insere a linha 1.
    const user = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select({ total: count() }).from(users)
      if ((existing?.total ?? 0) > 0) throw alreadyDone

      const claimed = await tx
        .insert(installation)
        .values({ id: 1, setupCompletedAt: this.clock.now() })
        .onConflictDoNothing()
        .returning()
      if (claimed.length === 0) throw alreadyDone

      const [created] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          role: 'ADMIN',
        })
        .returning()
      if (!created) throw alreadyDone
      return created
    })

    const { token } = await this.sessions.create(user.id)
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    }
  }
}
