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
  type ChangePasswordInput,
  changePasswordSchema,
  type InitialPasswordInput,
  initialPasswordSchema,
  type LoginInput,
  loginSchema,
  type SessionUserDto,
} from '@ninbi/contracts'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../common/zod.pipe'
import { AuthService } from './auth.service'
import { CurrentUser, Public } from './decorators'
import { SessionService, type SessionUser } from './session.service'
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

  @Public()
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

  @Post('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordInput,
  ): Promise<void> {
    await this.auth.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    )
  }

  @Post('initial-password')
  @HttpCode(204)
  async initialPassword(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(initialPasswordSchema))
    body: InitialPasswordInput,
  ): Promise<void> {
    await this.auth.setInitialPassword(user.id, body.newPassword)
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUserDto {
    return user
  }
}
