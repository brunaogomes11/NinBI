import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  noSessionHandler,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function currentUrl(router: {
  state: { location: { pathname: string; search: string } }
}) {
  const { pathname, search } = router.state.location
  return `${pathname}${search}`
}

describe('roteador e guardas', () => {
  it('SETUP-01 sem usuários a raiz vai para o primeiro acesso', async () => {
    const { router } = renderApp('/', {
      handlers: [setupStatusHandler(true), noSessionHandler()],
    })

    await waitFor(() => expect(currentUrl(router)).toBe('/primeiro-acesso'))
    expect(
      await screen.findByRole('heading', { name: 'Criar administrador' }),
    ).toBeInTheDocument()
  })

  it('SETUP-03 com usuários o primeiro acesso vai para o login', async () => {
    const { router } = renderApp('/primeiro-acesso', {
      handlers: [setupStatusHandler(false), noSessionHandler()],
    })

    await waitFor(() => expect(currentUrl(router)).toBe('/entrar'))
    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument()
  })

  it('AUTH-08 sem sessão a página protegida vai para o login guardando voltar', async () => {
    const { router } = renderApp('/configuracoes/usuarios', {
      handlers: [setupStatusHandler(false), noSessionHandler()],
    })

    await waitFor(() =>
      expect(currentUrl(router)).toBe(
        '/entrar?voltar=%2Fconfiguracoes%2Fusuarios',
      ),
    )
  })

  it('AUTH-08 voltar com endereço externo é ignorado', async () => {
    const { router } = renderApp('/entrar?voltar=//evil.com', {
      handlers: [setupStatusHandler(false), sessionHandler(makeUser())],
    })

    await waitFor(() => expect(currentUrl(router)).toBe('/'))
  })

  it('AUTH-08 sessão aberta no login segue para o voltar do próprio app', async () => {
    const { router } = renderApp('/entrar?voltar=%2Fconfiguracoes%2Fusuarios', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        usersHandler(),
      ],
    })

    await waitFor(() =>
      expect(currentUrl(router)).toBe('/configuracoes/usuarios'),
    )
  })

  it('ROLE-03 página não permitida mostra a mensagem de permissão com link para a página inicial', async () => {
    const { router, user } = renderApp('/configuracoes/usuarios', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser({ role: 'VIEWER' })),
      ],
    })

    expect(
      await screen.findByText(
        'Você não tem permissão para acessar esta página',
      ),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('link', { name: 'Ir para a página inicial' }),
    )

    await waitFor(() => expect(currentUrl(router)).toBe('/'))
  })

  it('ROLE-03 Admin abre a página de usuários', async () => {
    const { router } = renderApp('/configuracoes/usuarios', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        usersHandler(),
      ],
    })

    await waitFor(() =>
      expect(screen.getByText('Usuários')).toBeInTheDocument(),
    )
    expect(currentUrl(router)).toBe('/configuracoes/usuarios')
  })

  it('USR-06 sessão com senha provisória na raiz vai para definir a nova senha', async () => {
    const { router } = renderApp('/', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser({ mustChangePassword: true })),
      ],
    })

    await waitFor(() => expect(currentUrl(router)).toBe('/definir-senha'))
    expect(await screen.findByText('Definir nova senha')).toBeInTheDocument()
  })
})
