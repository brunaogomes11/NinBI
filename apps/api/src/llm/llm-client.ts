import type { BaseMessage } from '@langchain/core/messages'
import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AiProviderErrorCode } from '@ninbi/contracts'
import {
  CHAT_MODEL_FACTORY,
  type ChatModelFactory,
  type LlmSnapshot,
} from './chat-model.factory'
import {
  classifyProviderError,
  LlmCancelledError,
  LlmProviderError,
  LlmTimeoutError,
} from './provider-error'

export { LlmCancelledError, LlmProviderError, LlmTimeoutError }

export const LLM_CALL_TIMEOUT_MS = Symbol('LLM_CALL_TIMEOUT_MS')
export const DEFAULT_LLM_CALL_TIMEOUT_MS = 60_000

export interface LlmCallContext {
  userId: string
  purpose: 'widget' | 'test'
  attempt: number | null
  signal?: AbortSignal
}

type LogResult =
  | 'ok'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'context'
  | 'failed'
  | 'cancelled'

const RESULT_BY_CODE: Record<AiProviderErrorCode, LogResult> = {
  AI_PROVIDER_AUTH: 'auth',
  AI_PROVIDER_RATE_LIMIT: 'rate_limit',
  AI_PROVIDER_TIMEOUT: 'timeout',
  AI_PROVIDER_CONTEXT: 'context',
  AI_PROVIDER_FAILED: 'failed',
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      const text = (part as { type?: string; text?: unknown } | null)?.text
      return typeof text === 'string' ? text : ''
    })
    .join('')
}

function redactKey(text: string, apiKey: string | null): string {
  return apiKey ? text.split(apiKey).join('***') : text
}

/** Única porta de saída para o provedor: prazo, cancelamento, classificação do erro e log (AIQ-21 a AIQ-27). */
@Injectable()
export class LlmClient {
  private readonly logger = new Logger('Ai')

  constructor(
    @Inject(CHAT_MODEL_FACTORY) private readonly factory: ChatModelFactory,
    @Inject(LLM_CALL_TIMEOUT_MS) private readonly timeoutMs: number,
  ) {}

  async call(
    snapshot: LlmSnapshot,
    messages: BaseMessage[],
    ctx: LlmCallContext,
  ): Promise<string> {
    const started = Date.now()
    const timeout = AbortSignal.timeout(this.timeoutMs)
    const signal = ctx.signal ? AbortSignal.any([ctx.signal, timeout]) : timeout
    let result: LogResult = 'failed'
    try {
      const model = this.factory.create(snapshot)
      const reply = await model.invoke(messages, { signal })
      result = 'ok'
      return textOf(reply.content)
    } catch (err) {
      if (ctx.signal?.aborted) {
        result = 'cancelled'
        throw new LlmCancelledError()
      }
      const cause = timeout.aborted ? new LlmTimeoutError() : err
      const classified = classifyProviderError(cause)
      result = RESULT_BY_CODE[classified.code]
      // A chave em uso nunca sai daqui, nem se o provedor a ecoar na mensagem.
      throw new LlmProviderError(
        classified.code,
        redactKey(classified.message, snapshot.apiKey),
        redactKey(classified.providerMessage, snapshot.apiKey),
      )
    } finally {
      this.logger.log(
        `ai call purpose=${ctx.purpose} user=${ctx.userId} provider=${snapshot.provider} model=${snapshot.model} attempt=${ctx.attempt ?? '-'} durationMs=${Date.now() - started} result=${result}`,
      )
    }
  }
}
