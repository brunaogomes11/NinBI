import { SourceGatewayError, SourceTimeoutError } from '../source'

/** Erro qualquer do driver para `SourceGatewayError`, com a mensagem e o código do driver. */
export function toSourceGatewayError(error: unknown): SourceGatewayError {
  if (error instanceof SourceGatewayError) return error
  const raw = (error as { code?: unknown; errno?: unknown } | null)?.code
  const code =
    typeof raw === 'string'
      ? raw
      : typeof raw === 'number'
        ? String(raw)
        : undefined
  return new SourceGatewayError(
    error instanceof Error ? error.message : String(error),
    code,
  )
}

export interface DeadlineOptions {
  timeoutMs: number
  signal?: AbortSignal
  /** Erro do driver que já é o prazo vencido do lado do banco. */
  isTimeout?: (error: unknown) => boolean
  /** Converte o erro do driver; o padrão é `toSourceGatewayError`. */
  toError?: (error: unknown) => Error
}

/**
 * O padrão do `DriverNeo4jGateway`: o temporizador decide o prazo, o `signal`
 * cancela, e `close` sempre roda; só é esperado quando o prazo não estourou
 * (com o servidor mudo o fechamento pode demorar).
 */
export async function runWithDeadline<T>(
  options: DeadlineOptions,
  work: () => Promise<T>,
  close: (timedOut: boolean) => Promise<void>,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  let onAbort: (() => void) | undefined
  let timedOut = false
  const deadline = new Promise<never>((_, reject) => {
    const expire = () => {
      timedOut = true
      reject(new SourceTimeoutError())
    }
    timer = setTimeout(expire, options.timeoutMs)
    if (options.signal?.aborted) expire()
    else if (options.signal) {
      onAbort = expire
      options.signal.addEventListener('abort', onAbort, { once: true })
    }
  })
  deadline.catch(() => undefined)

  try {
    const working = timedOut ? Promise.reject(new SourceTimeoutError()) : work()
    working.catch(() => undefined)
    return await Promise.race([working, deadline])
  } catch (error) {
    if (error instanceof SourceTimeoutError) throw error
    if (options.isTimeout?.(error)) {
      timedOut = true
      throw new SourceTimeoutError()
    }
    throw (options.toError ?? toSourceGatewayError)(error)
  } finally {
    clearTimeout(timer)
    if (options.signal && onAbort) {
      options.signal.removeEventListener('abort', onAbort)
    }
    const closing = close(timedOut).catch(() => undefined)
    if (!timedOut) await closing
  }
}
