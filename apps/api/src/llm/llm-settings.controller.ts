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
  llmSettingsSchema,
} from '@ninbi/contracts'
import { CurrentUser, RequirePermission } from '../auth/decorators'
import type { SessionUser } from '../auth/session.service'
import { AppError } from '../common/app-error'
import { ZodValidationPipe } from '../common/zod.pipe'
import {
  type LlmSettingsInput,
  LlmSettingsService,
} from './llm-settings.service'

@RequirePermission('llm.manage')
@Controller('llm-config')
export class LlmSettingsController {
  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
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

  // Provisório até a T7, que liga o teste do provedor; já impõe a permissão (LLM-13).
  @Post('test')
  test(): never {
    throw new AppError(
      501,
      'INTERNAL_ERROR',
      'Teste do provedor ainda não disponível',
    )
  }
}
