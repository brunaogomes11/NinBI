import { HumanMessage } from '@langchain/core/messages'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Put,
} from '@nestjs/common'
import {
  type LlmSettingsDto,
  type LlmSettingsResponse,
  type LlmTestResultDto,
  llmSettingsSchema,
} from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { ZodValidationPipe } from '../common/zod.pipe'
import { LlmClient, LlmProviderError } from './llm-client'
import {
  type LlmSettingsInput,
  LlmSettingsService,
} from './llm-settings.service'

@RequirePermission('llm.manage')
@Controller('llm-config')
export class LlmSettingsController {
  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
    @Inject(LlmClient) private readonly client: LlmClient,
  ) {}

  @Get()
  get(): Promise<LlmSettingsResponse> {
    return this.settings.get()
  }

  @Put()
  save(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(llmSettingsSchema)) body: LlmSettingsInput,
  ): Promise<LlmSettingsDto> {
    return this.settings.save(user.id, body)
  }

  @Delete()
  @HttpCode(204)
  remove(): Promise<void> {
    return this.settings.remove()
  }

  /** Pedido mínimo, sem schema: qualquer resposta prova o provedor; nada é gravado (LLM-09, LLM-10). */
  @Post('test')
  @HttpCode(200)
  async test(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(llmSettingsSchema)) body: LlmSettingsInput,
  ): Promise<LlmTestResultDto> {
    const snapshot = await this.settings.snapshotFor(body)
    try {
      await this.client.call(
        snapshot,
        [new HumanMessage('Responda apenas: ok')],
        {
          userId: user.id,
          purpose: 'test',
          attempt: null,
        },
      )
    } catch (err) {
      if (err instanceof LlmProviderError) {
        throw new AppError(422, 'LLM_PROVIDER_ERROR', err.providerMessage)
      }
      throw err
    }
    return { ok: true }
  }
}
