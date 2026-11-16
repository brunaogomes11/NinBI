import { type AiProviderErrorCode, MESSAGES } from '@ninbi/contracts'

/** O provedor não respondeu dentro do prazo da chamada (AIQ-23). */
export class LlmTimeoutError extends Error {
  constructor() {
    super(MESSAGES.aiProviderTimeout)
    this.name = 'LlmTimeoutError'
  }
}

/** O usuário cancelou a geração; nada é mostrado (AIQ-13). */
export class LlmCancelledError extends Error {
  constructor() {
    super('Geração cancelada')
    this.name = 'LlmCancelledError'
  }
}

/** Falha do provedor já classificada: `message` é o texto da spec, `providerMessage` é o do provedor. */
export class LlmProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    message: string,
    readonly providerMessage: string,
  ) {
    super(message)
    this.name = 'LlmProviderError'
  }
}

export interface ClassifiedProviderError {
  code: AiProviderErrorCode
  message: string
  providerMessage: string
}

const CONTEXT_PATTERN =
  /context length|context window|maximum context|prompt is too long|too many tokens|exceeds the maximum.*tokens|input token count/i

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined
}

function httpStatus(err: unknown): number | undefined {
  for (const candidate of [
    field(err, 'status'),
    field(err, 'statusCode'),
    field(field(err, 'response'), 'status'),
  ]) {
    if (typeof candidate === 'number') return candidate
  }
  return undefined
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  return typeof err === 'string' ? err : 'erro desconhecido'
}

/** Traduz o erro de um provedor, na ordem do design; o que não casa vira "Erro do provedor de IA: ...". */
export function classifyProviderError(err: unknown): ClassifiedProviderError {
  const providerMessage = messageOf(err)
  const status = httpStatus(err)
  const lcCode = field(err, 'lc_error_code')
  const code = field(err, 'code') ?? field(field(err, 'error'), 'code')

  if (err instanceof LlmTimeoutError) {
    return {
      code: 'AI_PROVIDER_TIMEOUT',
      message: MESSAGES.aiProviderTimeout,
      providerMessage,
    }
  }
  if (status === 401 || status === 403 || lcCode === 'MODEL_AUTHENTICATION') {
    return {
      code: 'AI_PROVIDER_AUTH',
      message: MESSAGES.aiProviderAuth,
      providerMessage,
    }
  }
  if (status === 429 || lcCode === 'MODEL_RATE_LIMIT') {
    return {
      code: 'AI_PROVIDER_RATE_LIMIT',
      message: MESSAGES.aiProviderRateLimit,
      providerMessage,
    }
  }
  if (
    code === 'context_length_exceeded' ||
    CONTEXT_PATTERN.test(providerMessage)
  ) {
    return {
      code: 'AI_PROVIDER_CONTEXT',
      message: MESSAGES.aiProviderContext,
      providerMessage,
    }
  }
  return {
    code: 'AI_PROVIDER_FAILED',
    message: MESSAGES.aiProviderFailed(providerMessage),
    providerMessage,
  }
}
