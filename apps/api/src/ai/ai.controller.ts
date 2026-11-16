import { Controller, Get, Inject } from '@nestjs/common'
import type { AiStatusDto } from '@ninbi/contracts'
import { RequirePermission } from '../auth/decorators'
import { LlmSettingsService } from '../llm/llm-settings.service'

@RequirePermission('ai.use')
@Controller('ai')
export class AiController {
  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
  ) {}

  /** Só informa se há provedor; nada da configuração sai daqui (AIQ-16). */
  @Get('status')
  async status(): Promise<AiStatusDto> {
    return { configured: (await this.settings.get()).configured }
  }
}
