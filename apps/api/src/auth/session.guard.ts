import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { MESSAGES } from '@ninbi/contracts'
import type { Response } from 'express'
import { AppError } from '../common/app-error'
import { type AuthenticatedRequest, IS_PUBLIC_KEY } from './decorators'
import { SessionService } from './session.service'
import { readSessionToken, setSessionCookie } from './session-cookie'

/** Rotas que uma sessão com senha provisória ainda pode usar. */
const ALLOWED_WITH_TEMPORARY_PASSWORD = new Set([
  'GET /api/auth/me',
  'POST /api/auth/initial-password',
  'POST /api/auth/logout',
])

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const http = context.switchToHttp()
    const request = http.getRequest<AuthenticatedRequest>()
    const token = readSessionToken(request)
    const user = token ? await this.sessions.resolve(token) : null
    if (!token || !user) {
      throw new AppError(401, 'UNAUTHENTICATED', MESSAGES.unauthenticated)
    }

    request.user = user
    setSessionCookie(http.getResponse<Response>(), token)

    if (user.mustChangePassword) {
      const route = `${request.method} ${request.path.replace(/\/+$/, '')}`
      if (!ALLOWED_WITH_TEMPORARY_PASSWORD.has(route)) {
        throw new AppError(
          403,
          'PASSWORD_CHANGE_REQUIRED',
          MESSAGES.passwordChangeRequired,
        )
      }
    }
    return true
  }
}
