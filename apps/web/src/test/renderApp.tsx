import type { Role, SessionUserDto, UserDto } from '@ninbi/contracts'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http, type RequestHandler } from 'msw'
import {
  createMemoryRouter,
  type RouteObject,
  RouterProvider,
} from 'react-router'
import { AppProviders, createQueryClient } from '@/app/providers'
import { appRoutes } from '@/app/router'
import { server } from './server'

export function makeUser(
  overrides: Partial<SessionUserDto> = {},
): SessionUserDto {
  return {
    id: 'user-ana',
    name: 'Ana Souza',
    email: 'ana@x.com',
    role: 'ADMIN' satisfies Role,
    mustChangePassword: false,
    ...overrides,
  }
}

/** `GET /api/setup/status`. */
export function setupStatusHandler(needsSetup: boolean): RequestHandler {
  return http.get('/api/setup/status', () => HttpResponse.json({ needsSetup }))
}

/** `GET /api/auth/me` com sessão aberta para o usuário dado. */
export function sessionHandler(user: SessionUserDto): RequestHandler {
  return http.get('/api/auth/me', () => HttpResponse.json(user))
}

/** `GET /api/auth/me` sem sessão. */
export function noSessionHandler(): RequestHandler {
  return http.get('/api/auth/me', () =>
    HttpResponse.json(
      { code: 'UNAUTHENTICATED', message: 'Sessão expirada. Entre novamente.' },
      { status: 401 },
    ),
  )
}

/** Uma linha da lista de usuários (Ana Souza, ativa, por padrão). */
export function makeUserRow(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: 'u-1',
    name: 'Ana Souza',
    email: 'ana@x.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    mustChangePassword: false,
    ...overrides,
  }
}

/** `GET /api/users` com a lista dada. */
export function usersHandler(users: UserDto[] = []): RequestHandler {
  return http.get('/api/users', () => HttpResponse.json(users))
}

export interface RenderAppOptions {
  /** Handlers do MSW desta renderização (somados aos do teste). */
  handlers?: RequestHandler[]
  /** Rotas no lugar de `appRoutes`, para testar uma peça isolada. */
  routes?: RouteObject[]
}

/**
 * Renderiza o app inteiro (providers, roteador em memória e MSW) em `path`.
 * Devolve `router` (para conferir `router.state.location`), `queryClient` e
 * `user` (user-event) além do resultado do Testing Library.
 */
export function renderApp(path = '/', options: RenderAppOptions = {}) {
  server.use(...(options.handlers ?? []))
  const queryClient = createQueryClient()
  const router = createMemoryRouter(options.routes ?? appRoutes, {
    initialEntries: [path],
  })
  const user = userEvent.setup()
  const result = render(
    <AppProviders client={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...result, router, queryClient, user }
}
