import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import { AI_MAX_ATTEMPTS, AI_PROMPT_MAX, aiWidgetRequestSchema } from './ai'
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

const widgetId = '00000000-0000-4000-8000-000000000001'

const request = (overrides: Record<string, unknown> = {}) => ({
  prompt: 'total por categoria',
  widgetId,
  widget: { title: 'Vendas', cypher: null, visualization: 'TABLE', config: {} },
  ...overrides,
})

describe('ai contracts', () => {
  it('AIQ-14 pedido vazio é recusado', () => {
    expect(errorsOf(aiWidgetRequestSchema, request())).toBeNull()
    expect(
      errorsOf(aiWidgetRequestSchema, request({ prompt: '' })),
    ).not.toBeNull()
    expect(
      errorsOf(aiWidgetRequestSchema, request({ prompt: '   ' })),
    ).not.toBeNull()
    expect(AI_MAX_ATTEMPTS).toBe(4)
  })

  it('AIQ-15 pedido com mais de 4.000 caracteres dá a mensagem', () => {
    expect(AI_PROMPT_MAX).toBe(4000)
    expect(
      errorsOf(aiWidgetRequestSchema, request({ prompt: 'a'.repeat(4001) })),
    ).toEqual({ prompt: 'O pedido passa de 4.000 caracteres' })
    expect(
      errorsOf(aiWidgetRequestSchema, request({ prompt: 'a'.repeat(4000) })),
    ).toBeNull()
  })

  it('MESSAGES.aiGenerating(2) é "Gerando... tentativa 2 de 4"', () => {
    expect(MESSAGES.aiGenerating(2)).toBe('Gerando... tentativa 2 de 4')
  })

  it('MESSAGES.aiProviderFailed(\'x\') é "Erro do provedor de IA: x"', () => {
    expect(MESSAGES.aiProviderFailed('x')).toBe('Erro do provedor de IA: x')
  })

  it('widgetId que não é UUID é recusado', () => {
    expect(
      errorsOf(aiWidgetRequestSchema, request({ widgetId: 'abc' })),
    ).toHaveProperty('widgetId')
  })
})
