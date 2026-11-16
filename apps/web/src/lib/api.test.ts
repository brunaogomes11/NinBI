import { MESSAGES } from '@ninbi/contracts'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/server'
import { ApiError, apiFetch, onUnauthorized } from './api'

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }
  throw new Error('a chamada deveria falhar')
}

describe('apiFetch', () => {
  let unregister: (() => void) | undefined

  afterEach(() => unregister?.())

  it('AUTH-13 erro de resposta vira ApiError com code, message e fieldErrors', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: MESSAGES.validationError,
            fieldErrors: { email: MESSAGES.emailInvalid },
          },
          { status: 400 },
        ),
      ),
    )

    const error = await failure(
      apiFetch('/api/auth/login', { method: 'POST', body: { email: 'ana@' } }),
    )

    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe(MESSAGES.validationError)
    expect(error.fieldErrors).toEqual({ email: MESSAGES.emailInvalid })
  })

  it('AUTH-08 resposta 401 chama onUnauthorized', async () => {
    const handler = vi.fn()
    unregister = onUnauthorized(handler)
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json(
          { code: 'UNAUTHENTICATED', message: MESSAGES.unauthenticated },
          { status: 401 },
        ),
      ),
    )

    const error = await failure(apiFetch('/api/users'))

    expect(error.status).toBe(401)
    expect(error.code).toBe('UNAUTHENTICATED')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('AUTH-08 resposta 401 do login não chama onUnauthorized', async () => {
    const handler = vi.fn()
    unregister = onUnauthorized(handler)
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { code: 'INVALID_CREDENTIALS', message: MESSAGES.invalidCredentials },
          { status: 401 },
        ),
      ),
    )

    const error = await failure(
      apiFetch('/api/auth/login', {
        method: 'POST',
        body: {},
        notifyUnauthorized: false,
      }),
    )

    expect(error.message).toBe(MESSAGES.invalidCredentials)
    expect(handler).not.toHaveBeenCalled()
  })

  it('AUTH-13 falha de rede vira ApiError com status 0 e a mensagem de conexão', async () => {
    server.use(http.get('/api/users', () => HttpResponse.error()))

    const error = await failure(apiFetch('/api/users'))

    expect(error.status).toBe(0)
    expect(error.message).toBe(
      'Não foi possível conectar ao servidor. Tente novamente.',
    )
  })
})
