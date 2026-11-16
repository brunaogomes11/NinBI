import { Inject, Injectable } from '@nestjs/common'
import {
  type LlmSettingsDto,
  type LlmSettingsResponse,
  type llmSettingsSchema,
  MESSAGES,
  PROVIDERS_REQUIRING_KEY,
} from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import { AppError } from '../common/app-error'
import { Clock } from '../common/clock'
import { CryptoService } from '../crypto/crypto.service'
import { type AppDatabase, DB } from '../database/database.module'
import { type LlmSettingsRow, llmSettings } from '../database/schema'
import type { LlmSnapshot } from './chat-model.factory'

export type LlmSettingsInput = z.output<typeof llmSettingsSchema>

const SINGLE_ROW_ID = 1
const KEY_SUFFIX_LENGTH = 4

/** Única função que monta a resposta: nenhum campo carrega a chave (LLM-04). */
export function toLlmSettingsDto(row: LlmSettingsRow): LlmSettingsDto {
  return {
    configured: true,
    provider: row.provider,
    model: row.model,
    baseUrl: row.baseUrl,
    apiKeyLast4: row.apiKeyLast4,
    updatedAt: row.updatedAt.toISOString(),
  }
}

function apiKeyRequired(): AppError {
  return new AppError(400, 'VALIDATION_ERROR', MESSAGES.validationError, {
    apiKey: MESSAGES.llmApiKeyRequired,
  })
}

/** Configuração do provedor de LLM: uma por instalação, com a chave só cifrada (LLM-03 a LLM-08, LLM-12). */
@Injectable()
export class LlmSettingsService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async get(): Promise<LlmSettingsResponse> {
    const row = await this.row()
    return row ? toLlmSettingsDto(row) : { configured: false }
  }

  async save(userId: string, input: LlmSettingsInput): Promise<LlmSettingsDto> {
    const existing = await this.row()
    const typedKey = input.apiKey || null
    if (
      !typedKey &&
      !existing?.apiKeyEncrypted &&
      PROVIDERS_REQUIRING_KEY.includes(input.provider)
    ) {
      throw apiKeyRequired()
    }
    const key = typedKey
      ? {
          apiKeyEncrypted: this.crypto.encrypt(typedKey),
          apiKeyLast4: typedKey.slice(-KEY_SUFFIX_LENGTH),
        }
      : {
          apiKeyEncrypted: existing?.apiKeyEncrypted ?? null,
          apiKeyLast4: existing?.apiKeyLast4 ?? null,
        }
    const values = {
      provider: input.provider,
      model: input.model,
      baseUrl: input.baseUrl || null,
      ...key,
      updatedBy: userId,
      updatedAt: this.clock.now(),
    }
    const rows = await this.db
      .insert(llmSettings)
      .values({ id: SINGLE_ROW_ID, ...values })
      .onConflictDoUpdate({ target: llmSettings.id, set: values })
      .returning()
    const [row] = rows
    if (!row) throw new Error('configuração do LLM não gravada')
    return toLlmSettingsDto(row)
  }

  async remove(): Promise<void> {
    await this.db.delete(llmSettings).where(eq(llmSettings.id, SINGLE_ROW_ID))
  }

  /**
   * Configuração do formulário para o teste (LLM-09): a chave digitada vale; vazia, usa a guardada só com o mesmo provedor e a mesma URL base.
   * Não grava nada.
   */
  async snapshotFor(input: LlmSettingsInput): Promise<LlmSnapshot> {
    const existing = await this.row()
    // A chave guardada só acompanha o provedor e a URL base a que pertence (F5).
    const sameTarget =
      existing !== undefined &&
      existing.provider === input.provider &&
      (existing.baseUrl ?? null) === (input.baseUrl || null)
    const apiKey =
      input.apiKey ||
      (sameTarget && existing?.apiKeyEncrypted
        ? this.crypto.decrypt(existing.apiKeyEncrypted)
        : null)
    if (!apiKey && PROVIDERS_REQUIRING_KEY.includes(input.provider)) {
      throw apiKeyRequired()
    }
    return {
      provider: input.provider,
      model: input.model,
      baseUrl: input.baseUrl || null,
      apiKey,
    }
  }

  /** Lê a configuração e decifra a chave uma vez; quem gera usa esta cópia até o fim (LLM-15). */
  async snapshot(): Promise<LlmSnapshot | null> {
    const row = await this.row()
    if (!row) return null
    return {
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl,
      apiKey: row.apiKeyEncrypted
        ? this.crypto.decrypt(row.apiKeyEncrypted)
        : null,
    }
  }

  private async row(): Promise<LlmSettingsRow | undefined> {
    const [row] = await this.db
      .select()
      .from(llmSettings)
      .where(eq(llmSettings.id, SINGLE_ROW_ID))
    return row
  }
}
