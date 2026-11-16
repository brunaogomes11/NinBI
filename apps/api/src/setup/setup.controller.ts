import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Res,
} from '@nestjs/common'
import {
  type SessionUserDto,
  type SetupAdminInput,
  setupAdminSchema,
} from '@ninbi/contracts'
import type { Response } from 'express'
import { Public } from '../auth/decorators'
import { setSessionCookie } from '../auth/session-cookie'
import { ZodValidationPipe } from '../common/zod.pipe'
import { SetupService } from './setup.service'

@Public()
@Controller('setup')
export class SetupController {
  constructor(@Inject(SetupService) private readonly setup: SetupService) {}

  @Get('status')
  async status(): Promise<{ needsSetup: boolean }> {
    return { needsSetup: await this.setup.needsSetup() }
  }

  @Post('admin')
  @HttpCode(201)
  async createAdmin(
    @Body(new ZodValidationPipe(setupAdminSchema)) body: SetupAdminInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUserDto> {
    const { user, token } = await this.setup.createAdmin(body)
    setSessionCookie(res, token)
    return user
  }
}
