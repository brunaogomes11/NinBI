import { type ApiErrorBody, MESSAGES } from '@ninbi/contracts'
import { ApiError, notifyUnauthorizedHandler } from '@/lib/api'

const LINE_BREAK = String.fromCharCode(10)

async function failureOf(response: Response): Promise<ApiError> {
  let error: Partial<ApiErrorBody> = {}
  try {
    error = await response.json()
  } catch {
    // corpo ausente ou que não é JSON: vale a mensagem genérica
  }
  return new ApiError(
    response.status,
    error.code ?? 'INTERNAL_ERROR',
    error.message ?? MESSAGES.internalError,
    error.fieldErrors,
  )
}

/**
 * Envia o corpo por POST e lê a resposta NDJSON: `onEvent` recebe cada linha ao chegar e o
 * último evento volta como resultado. Erro HTTP vira `ApiError`; abortar rejeita com o erro de aborto.
 */
export async function postNdjson<E>(
  path: string,
  body: unknown,
  signal: AbortSignal,
  onEvent: (event: E) => void,
): Promise<E> {
  let response: Response
  try {
    response = await fetch(new URL(path, window.location.origin), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new ApiError(0, 'INTERNAL_ERROR', MESSAGES.serverUnreachable)
  }

  if (!response.ok) {
    if (response.status === 401) notifyUnauthorizedHandler()
    throw await failureOf(response)
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let last: E | null = null
  let pending = ''

  const emit = (line: string) => {
    if (line.trim() === '') return
    last = JSON.parse(line) as E
    onEvent(last)
  }

  if (reader) {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      let newline = pending.indexOf(LINE_BREAK)
      while (newline !== -1) {
        emit(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        newline = pending.indexOf(LINE_BREAK)
      }
    }
    pending += decoder.decode()
    emit(pending)
  }

  if (last === null) {
    throw new ApiError(
      response.status,
      'INTERNAL_ERROR',
      MESSAGES.internalError,
    )
  }
  return last
}
