import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
} from '@nestjs/common'
import type { AssistantMessageDto } from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { AssistantHistoryService } from './assistant-history.service'

@RequirePermission('ai.use')
@Controller('dashboards/:id/assistant/messages')
export class AssistantController {
  constructor(
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
    @Inject(AssistantHistoryService)
    private readonly history: AssistantHistoryService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<AssistantMessageDto[]> {
    await this.access.assert(user, id, 'edit')
    return this.history.list(user.id, id)
  }

  @Delete()
  @HttpCode(204)
  async clear(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.access.assert(user, id, 'edit')
    await this.history.clear(user.id, id)
  }
}
