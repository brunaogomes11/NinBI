import { Inject, Injectable } from '@nestjs/common'
import { MESSAGES, type SessionUserDto } from '@ninbi/contracts'
import { sql } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { type AppDatabase, DB } from '../database/database.module'
import { users } from '../database/schema'
import { LoginThrottleService } from './login-throttle.service'
import { PasswordHasher } from './password-hasher'
import { SessionService } from './session.service'

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>

  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(LoginThrottleService)
    private readonly throttle: LoginThrottleService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ user: SessionUserDto; token: string }> {
    if (await this.throttle.isLocked(email)) {
      throw new AppError(429, 'TOO_MANY_ATTEMPTS', MESSAGES.tooManyAttempts)
    }
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)

    // Sem usuário, verifica contra um hash fictício para o tempo não revelar o e-mail.
    const passwordOk = await this.hasher.verify(
      password,
      user?.passwordHash ?? (await this.getDummyHash()),
    )
    if (!user || !passwordOk || user.status !== 'ACTIVE') {
      await this.throttle.registerFailure(email)
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        MESSAGES.invalidCredentials,
      )
    }

    await this.throttle.reset(email)
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

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('senha-ficticia-sem-usuario')
    return this.dummyHash
  }
}
