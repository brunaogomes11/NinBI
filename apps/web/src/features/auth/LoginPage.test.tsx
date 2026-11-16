import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  noSessionHandler,
  renderApp,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function loginHandler(
  respond: () => Response | Promise<Response>,
  onRequest: (body: unknown) => void = () => {},
) {
  return http.post('/api/auth/login', async ({ request }) => {
    onRequest(await request.json())
    return respond()
  })
}

const base = [setupStatusHandler(false), noSessionHandler()]

async function submit(
  user: ReturnType<typeof renderApp>['user'],
  email: string,
  password: string,
) {
  await screen.findByLabelText('E-mail')
  if (email) await user.type(screen.getByLabelText('E-mail'), email)
  if (password) await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  it('AUTH-01 entrar com dados corretos abre a página inicial', async () => {
    const bodies: unknown[] = []
    const { user, router } = renderApp('/entrar', {
      handlers: [
        ...base,
        loginHandler(
          () => HttpResponse.json(makeUser()),
          (b) => bodies.push(b),
        ),
      ],
    })

    await submit(user, 'ana@x.com', 'senha-correta-123')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    expect(bodies).toEqual([
      { email: 'ana@x.com', password: 'senha-correta-123' },
    ])
  })

  it('AUTH-02 credenciais erradas mostram E-mail ou senha incorretos', async () => {
    const { user, router } = renderApp('/entrar', {
      handlers: [
        ...base,
        loginHandler(() =>
          HttpResponse.json(
            {
              code: 'INVALID_CREDENTIALS',
              message: MESSAGES.invalidCredentials,
            },
            { status: 401 },
          ),
        ),
      ],
    })

    await submit(user, 'ana@x.com', 'senha-errada-123')

    expect(
      await screen.findByText('E-mail ou senha incorretos'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('AUTH-03 e-mail inválido ou senha vazia mostram a mensagem no campo sem enviar', async () => {
    const bodies: unknown[] = []
    const { user } = renderApp('/entrar', {
      handlers: [
        ...base,
        loginHandler(
          () => HttpResponse.json(makeUser()),
          (b) => bodies.push(b),
        ),
      ],
    })

    await submit(user, '', '')
    expect(await screen.findByText('Informe o e-mail')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'ana@')
    await user.type(screen.getByLabelText('Senha'), 'senha-correta-123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(
      await screen.findByText('Informe um e-mail válido'),
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText('E-mail'))
    await user.type(screen.getByLabelText('E-mail'), 'ana@x.com')
    await user.clear(screen.getByLabelText('Senha'))
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe a senha')).toBeInTheDocument()

    expect(bodies).toEqual([])
  })

  it('AUTH-04 bloqueio mostra Muitas tentativas', async () => {
    const { user } = renderApp('/entrar', {
      handlers: [
        ...base,
        loginHandler(() =>
          HttpResponse.json(
            { code: 'TOO_MANY_ATTEMPTS', message: MESSAGES.tooManyAttempts },
            { status: 429 },
          ),
        ),
      ],
    })

    await submit(user, 'ana@x.com', 'senha-correta-123')

    expect(
      await screen.findByText(
        'Muitas tentativas. Tente novamente em 15 minutos.',
      ),
    ).toBeInTheDocument()
  })

  it('AUTH-05 botão Entrar fica desabilitado durante o envio', async () => {
    const { user } = renderApp('/entrar', {
      handlers: [
        ...base,
        http.post('/api/auth/login', async () => {
          await delay('infinite')
          return HttpResponse.json(makeUser())
        }),
      ],
    })

    await submit(user, 'ana@x.com', 'senha-correta-123')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled(),
    )
  })

  it('AUTH-08 401 leva ao login e depois do login abre a página pedida', async () => {
    const { user, router } = renderApp('/configuracoes/usuarios', {
      handlers: [
        ...base,
        loginHandler(() => HttpResponse.json(makeUser())),
        usersHandler(),
      ],
    })

    await screen.findByLabelText('E-mail')
    expect(router.state.location.search).toBe(
      '?voltar=%2Fconfiguracoes%2Fusuarios',
    )

    await submit(user, 'ana@x.com', 'senha-correta-123')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/configuracoes/usuarios'),
    )
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('AUTH-13 backend fora do ar mostra Não foi possível conectar ao servidor', async () => {
    const { user } = renderApp('/entrar', {
      handlers: [
        ...base,
        http.post('/api/auth/login', () => HttpResponse.error()),
      ],
    })

    await submit(user, 'ana@x.com', 'senha-correta-123')

    expect(
      await screen.findByText(
        'Não foi possível conectar ao servidor. Tente novamente.',
      ),
    ).toBeInTheDocument()
  })

  it('SHELL-14 login mostra o símbolo e NinBI', async () => {
    const { container } = renderApp('/entrar', { handlers: base })
    await screen.findByLabelText('E-mail')

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/brand/ninbi-symbol.png',
    )
    expect(container.querySelector('img + span')).toHaveTextContent(/^NinBI$/)
  })
})
