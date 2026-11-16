import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import {
  type LoginInput,
  loginSchema,
  MESSAGES,
  type SessionUserDto,
} from '@ninbi/contracts'
import type { Request, Response } from 'express'
import { AppError } from '../common/app-error'
import { ZodValidationPipe } from '../common/zod.pipe'
import { AuthService } from './auth.service'
import { SessionService } from './session.service'
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from './session-cookie'

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUserDto> {
    const { user, token } = await this.auth.login(body.email, body.password)
    setSessionCookie(res, token)
    return user
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = readSessionToken(req)
    if (token) await this.sessions.revoke(token)
    clearSessionCookie(res)
  }

  @Get('me')
  async me(@Req() req: Request): Promise<SessionUserDto> {
    const token = readSessionToken(req)
    const user = token ? await this.sessions.resolve(token) : null
    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', MESSAGES.unauthenticated)
    }
    return user
  }
}
