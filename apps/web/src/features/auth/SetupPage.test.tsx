import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  noSessionHandler,
  renderApp,
  setupStatusHandler,
} from '@/test/renderApp'

async function fill(
  user: ReturnType<typeof renderApp>['user'],
  values: {
    name?: string
    email?: string
    password?: string
    confirm?: string
  },
) {
  if (values.name) await user.type(screen.getByLabelText('Nome'), values.name)
  if (values.email)
    await user.type(screen.getByLabelText('E-mail'), values.email)
  if (values.password)
    await user.type(screen.getByLabelText('Senha'), values.password)
  if (values.confirm)
    await user.type(screen.getByLabelText('Confirmar senha'), values.confirm)
}

function adminHandler(onRequest: (body: unknown) => void, status = 201) {
  return http.post('/api/setup/admin', async ({ request }) => {
    onRequest(await request.json())
    if (status === 409) {
      return HttpResponse.json(
        { code: 'SETUP_ALREADY_DONE', message: MESSAGES.setupAlreadyDone },
        { status },
      )
    }
    return HttpResponse.json(makeUser(), { status })
  })
}

describe('SetupPage', () => {
  it('SETUP-01 sem usuários mostra Criar administrador com Nome, E-mail, Senha e Confirmar senha', async () => {
    renderApp('/primeiro-acesso', { handlers: [setupStatusHandler(true)] })

    expect(
      await screen.findByRole('heading', { name: 'Criar administrador' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Criar administrador' }),
    ).toBeInTheDocument()
  })

  it('SETUP-02 enviar o formulário válido abre a página inicial', async () => {
    const bodies: unknown[] = []
    const { user, router } = renderApp('/primeiro-acesso', {
      handlers: [setupStatusHandler(true), adminHandler((b) => bodies.push(b))],
    })
    await screen.findByLabelText('Nome')

    await fill(user, {
      name: 'Ana Souza',
      email: 'ana@x.com',
      password: 'senha-forte-1',
      confirm: 'senha-forte-1',
    })
    await user.click(
      screen.getByRole('button', { name: 'Criar administrador' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(bodies).toEqual([
      {
        name: 'Ana Souza',
        email: 'ana@x.com',
        password: 'senha-forte-1',
        confirmPassword: 'senha-forte-1',
      },
    ])
  })

  it('SETUP-03 com usuário existente mostra a tela de login', async () => {
    const { user, router } = renderApp('/primeiro-acesso', {
      handlers: [
        setupStatusHandler(true),
        noSessionHandler(),
        adminHandler(() => {}, 409),
      ],
    })
    await screen.findByLabelText('Nome')

    await fill(user, {
      name: 'Ana Souza',
      email: 'ana@x.com',
      password: 'senha-forte-1',
      confirm: 'senha-forte-1',
    })
    await user.click(
      screen.getByRole('button', { name: 'Criar administrador' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'))
    expect((await screen.findAllByText('Entrar')).length).toBeGreaterThan(0)
  })

  it('SETUP-04 senha curta mantém o formulário e mostra a mensagem', async () => {
    const bodies: unknown[] = []
    const { user, router } = renderApp('/primeiro-acesso', {
      handlers: [setupStatusHandler(true), adminHandler((b) => bodies.push(b))],
    })
    await screen.findByLabelText('Nome')

    await fill(user, {
      name: 'Ana Souza',
      email: 'ana@x.com',
      password: '1234567',
      confirm: '1234567',
    })
    await user.click(
      screen.getByRole('button', { name: 'Criar administrador' }),
    )

    expect(
      await screen.findByText('A senha precisa ter ao menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/primeiro-acesso')
    expect(bodies).toEqual([])
  })

  it('SETUP-05 senhas diferentes mostram As senhas não conferem', async () => {
    const bodies: unknown[] = []
    const { user } = renderApp('/primeiro-acesso', {
      handlers: [setupStatusHandler(true), adminHandler((b) => bodies.push(b))],
    })
    await screen.findByLabelText('Nome')

    await fill(user, {
      name: 'Ana Souza',
      email: 'ana@x.com',
      password: 'senha-forte-1',
      confirm: 'senha-forte-2',
    })
    await user.click(
      screen.getByRole('button', { name: 'Criar administrador' }),
    )

    expect(
      await screen.findByText('As senhas não conferem'),
    ).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('SHELL-14 primeiro acesso mostra o símbolo e NinBI', async () => {
    const { container } = renderApp('/primeiro-acesso', {
      handlers: [setupStatusHandler(true)],
    })
    await screen.findByLabelText('Nome')

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/brand/ninbi-symbol.png',
    )
    expect(container.querySelector('img + span')).toHaveTextContent(/^NinBI$/)
  })
})
