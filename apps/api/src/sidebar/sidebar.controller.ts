import { Body, Controller, Get, Inject, Put } from '@nestjs/common'
import {
  type SidebarDto,
  type SidebarLayoutInput,
  sidebarLayoutSchema,
} from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { SidebarService } from './sidebar.service'

@Controller('sidebar')
export class SidebarController {
  constructor(
    @Inject(SidebarService) private readonly sidebar: SidebarService,
  ) {}

  @RequirePermission('sidebar.own')
  @Get()
  get(@CurrentUser() user: SessionUser): Promise<SidebarDto> {
    return this.sidebar.get(user)
  }

  @RequirePermission('sidebar.own')
  @Put()
  save(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(sidebarLayoutSchema))
    body: SidebarLayoutInput,
  ): Promise<SidebarDto> {
    return this.sidebar.save(user, body)
  }
}
