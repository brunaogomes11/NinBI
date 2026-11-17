import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Res,
} from '@nestjs/common'
import {
  type AssistantEvent,
  type AssistantMessageDto,
  assistantRequestSchema,
} from '@ninbi/contracts'
import type { Response } from 'express'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { type AssistantBody, AssistantService } from './assistant.service'
import { AssistantHistoryService } from './assistant-history.service'

@RequirePermission('ai.use')
@Controller('dashboards/:id/assistant/messages')
export class AssistantController {
  constructor(
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
    @Inject(AssistantHistoryService)
    private readonly history: AssistantHistoryService,
    @Inject(AssistantService) private readonly assistant: AssistantService,
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

  /**
   * Atende a mensagem e responde um evento JSON por linha (AD-121). Os erros de antes do pedido
   * saem como JSON comum; depois do primeiro byte só há eventos. Fechar a conexão cancela.
   */
  @Post()
  @HttpCode(200)
  async send(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assistantRequestSchema)) body: AssistantBody,
    @Res() res: Response,
  ): Promise<void> {
    const access = await this.access.assert(user, id, 'edit')
    const prepared = await this.assistant.prepare({
      userId: user.id,
      role: user.role,
      dashboardId: id,
      dashboardConnectionId: access.connectionId,
      body,
    })

    const abort = new AbortController()
    res.on('close', () => {
      if (!res.writableEnded) abort.abort()
    })
    res.status(200)
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const emit = (event: AssistantEvent) => {
      if (!res.writableEnded)
        res.write(`${JSON.stringify(event)}
`)
    }
    try {
      await this.assistant.run(prepared, emit, abort.signal)
    } finally {
      res.end()
    }
  }
}
