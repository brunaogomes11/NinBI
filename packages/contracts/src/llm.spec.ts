import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  LLM_PROVIDER_LABELS,
  LLM_PROVIDERS,
  llmSettingsSchema,
  PROVIDERS_REQUIRING_BASE_URL,
  PROVIDERS_REQUIRING_KEY,
} from './llm'
import { MESSAGES } from './messages'

function errorsOf(
  schema: ZodType,
  value: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(value)
  if (result.success) return null
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    if (!(field in byField)) byField[field] = issue.message
  }
  return byField
}

describe('llm contracts', () => {
  it('LLM-02 provedores na ordem OpenAI, Anthropic, Google Gemini, Ollama e Compatível com OpenAI', () => {
    expect(LLM_PROVIDERS.map((p) => LLM_PROVIDER_LABELS[p])).toEqual([
      'OpenAI',
      'Anthropic',
      'Google Gemini',
      'Ollama',
      'Compatível com OpenAI',
    ])
    expect(PROVIDERS_REQUIRING_KEY).toEqual(['OPENAI', 'ANTHROPIC', 'GOOGLE'])
    expect(PROVIDERS_REQUIRING_BASE_URL).toEqual([
      'OLLAMA',
      'OPENAI_COMPATIBLE',
    ])
  })

  it('LLM-06 Ollama e Compatível com OpenAI exigem URL base', () => {
    for (const provider of ['OLLAMA', 'OPENAI_COMPATIBLE']) {
      expect(errorsOf(llmSettingsSchema, { provider, model: 'm' })).toEqual({
        baseUrl: 'Informe a URL base',
      })
      expect(
        errorsOf(llmSettingsSchema, { provider, model: 'm', baseUrl: '   ' }),
      ).toEqual({ baseUrl: 'Informe a URL base' })
      expect(
        errorsOf(llmSettingsSchema, {
          provider,
          model: 'm',
          baseUrl: 'http://localhost:11434',
        }),
      ).toBeNull()
    }
    expect(
      errorsOf(llmSettingsSchema, { provider: 'OPENAI', model: 'm' }),
    ).toBeNull()
    expect(
      errorsOf(llmSettingsSchema, {
        provider: 'OPENAI',
        model: 'm',
        baseUrl: 'ftp://x',
      }),
    ).toEqual({ baseUrl: 'Informe uma URL válida' })
    expect(MESSAGES.llmBaseUrlRequired).toBe('Informe a URL base')
  })

  it('LLM-08 modelo vazio dá Informe o modelo', () => {
    const base = { provider: 'OPENAI' }
    expect(errorsOf(llmSettingsSchema, { ...base, model: '' })).toEqual({
      model: 'Informe o modelo',
    })
    expect(errorsOf(llmSettingsSchema, { ...base, model: '   ' })).toEqual({
      model: 'Informe o modelo',
    })
    expect(
      errorsOf(llmSettingsSchema, { ...base, model: 'a'.repeat(201) }),
    ).not.toBeNull()
    expect(
      errorsOf(llmSettingsSchema, { ...base, model: 'a'.repeat(200) }),
    ).toBeNull()
  })
})
