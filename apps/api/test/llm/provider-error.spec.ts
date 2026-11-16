import { describe, expect, it } from 'vitest'
import { classifyProviderError } from '../../src/llm/provider-error'

function withFields(message: string, fields: Record<string, unknown>): Error {
  return Object.assign(new Error(message), fields)
}

describe('classifyProviderError', () => {
  it('AIQ-21 erro 401 ou MODEL_AUTHENTICATION é chave recusada', () => {
    const expected = {
      code: 'AI_PROVIDER_AUTH',
      message: 'O provedor de IA recusou a chave configurada',
    }
    const errors = [
      withFields('Incorrect API key provided', { status: 401 }),
      withFields('forbidden', { status: 403 }),
      withFields('nope', { response: { status: 401 } }),
      withFields('nope', { lc_error_code: 'MODEL_AUTHENTICATION' }),
    ]
    for (const err of errors) {
      expect(classifyProviderError(err)).toMatchObject(expected)
    }
    expect(classifyProviderError(errors[0]).providerMessage).toBe(
      'Incorrect API key provided',
    )
  })

  it('AIQ-22 erro 429 ou MODEL_RATE_LIMIT é limite de uso', () => {
    const expected = {
      code: 'AI_PROVIDER_RATE_LIMIT',
      message: 'O provedor de IA recusou o pedido por limite de uso',
    }
    expect(
      classifyProviderError(withFields('slow down', { status: 429 })),
    ).toMatchObject(expected)
    expect(
      classifyProviderError(
        withFields('slow down', { lc_error_code: 'MODEL_RATE_LIMIT' }),
      ),
    ).toMatchObject(expected)
  })

  it('AIQ-24 contexto excedido vira a mensagem do schema', () => {
    const message =
      'O schema desta conexão não cabe no modelo configurado. Desligue exemplos longos em Conexões ou use um modelo com contexto maior.'
    const errors = [
      withFields('too big', { code: 'context_length_exceeded' }),
      new Error('prompt is too long: 250000 tokens > 200000 maximum'),
      new Error(
        "This model's maximum context length is 8192 tokens, however you requested 9000",
      ),
    ]
    for (const err of errors) {
      expect(classifyProviderError(err)).toMatchObject({
        code: 'AI_PROVIDER_CONTEXT',
        message,
      })
    }
  })

  it('AIQ-25 outro erro vira Erro do provedor de IA com a mensagem', () => {
    expect(classifyProviderError(new Error('boom'))).toEqual({
      code: 'AI_PROVIDER_FAILED',
      message: 'Erro do provedor de IA: boom',
      providerMessage: 'boom',
    })
  })
})
