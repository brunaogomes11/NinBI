import { type ApiErrorBody, type ErrorCode, MESSAGES } from '@ninbi/contracts'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fieldErrors?: Record<string, string>

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** Registra quem reage a um 401; devolve a função que remove o registro. */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  /** Corpo da requisição, enviado como JSON. */
  body?: unknown
  /** Quando false, um 401 não chama `onUnauthorized` (login e consulta da sessão). */
  notifyUnauthorized?: boolean
}

export async function apiFetch<T = void>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { body, notifyUnauthorized = true, headers, ...rest } = init
  let response: Response
  try {
    response = await fetch(new URL(path, window.location.origin), {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'INTERNAL_ERROR', MESSAGES.serverUnreachable)
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  if (response.status === 401 && notifyUnauthorized) unauthorizedHandler?.()

  let error: Partial<ApiErrorBody> = {}
  try {
    error = await response.json()
  } catch {
    // corpo ausente ou que não é JSON: vale a mensagem genérica
  }
  throw new ApiError(
    response.status,
    error.code ?? 'INTERNAL_ERROR',
    error.message ?? MESSAGES.internalError,
    error.fieldErrors,
  )
}
