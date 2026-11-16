import type { LlmSettingsDto, LlmSettingsResponse } from '@ninbi/contracts'
import { HttpResponse, http, type RequestHandler } from 'msw'

/** Configuração do LLM já salva (OpenAI, `gpt-4o`, chave terminada em 1234, por padrão). */
export function makeLlmSettings(
  overrides: Partial<LlmSettingsDto> = {},
): LlmSettingsDto {
  return {
    configured: true,
    provider: 'OPENAI',
    model: 'gpt-4o',
    baseUrl: null,
    apiKeyLast4: '1234',
    updatedAt: '2026-11-16T17:30:00Z',
    ...overrides,
  }
}

/** `GET /api/llm-config` com a resposta dada. */
export function llmConfigHandler(
  response: LlmSettingsResponse = { configured: false },
): RequestHandler {
  return http.get('/api/llm-config', () => HttpResponse.json(response))
}
