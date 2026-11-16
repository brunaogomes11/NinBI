import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common'
import {
  type AiStatusDto,
  type AiWidgetEvent,
  aiWidgetRequestSchema,
} from '@ninbi/contracts'
import type { Response } from 'express'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { ZodValidationPipe } from '../common/zod.pipe'
import { DashboardAccessService } from '../dashboard-access/dashboard-access.service'
import { LlmSettingsService } from '../llm/llm-settings.service'
import { type AiWidgetBody, AiWidgetService } from './ai-widget.service'

@RequirePermission('ai.use')
@Controller()
export class AiController {
  private readonly logger = new Logger('Ai')

  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
    @Inject(DashboardAccessService)
    private readonly access: DashboardAccessService,
    @Inject(AiWidgetService) private readonly widgets: AiWidgetService,
  ) {}

  /** Só informa se há provedor; nada da configuração sai daqui (AIQ-16). */
  @Get('ai/status')
  async status(): Promise<AiStatusDto> {
    return { configured: (await this.settings.get()).configured }
  }

  /**
   * Gera o widget e responde um evento JSON por linha (AD-083). Os erros de antes da geração
   * saem como JSON comum; depois do primeiro byte só há eventos. Fechar a conexão cancela.
   */
  @Post('dashboards/:id/ai/widget')
  @HttpCode(200)
  async widget(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(aiWidgetRequestSchema)) body: AiWidgetBody,
    @Res() res: Response,
  ): Promise<void> {
    const access = await this.access.assert(user, id, 'edit')
    const prepared = await this.widgets.prepare({
      userId: user.id,
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

    const emit = (event: AiWidgetEvent) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`)
    }
    try {
      await this.widgets.run(prepared, emit, abort.signal)
    } catch (error) {
      this.logger.error(
        `geração interrompida: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      )
    } finally {
      res.end()
    }
  }
}
