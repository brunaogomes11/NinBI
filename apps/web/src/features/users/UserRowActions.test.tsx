import { MESSAGES, type UserDto } from '@ninbi/contracts'
import { screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  makeUserRow,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

interface Calls {
  role: unknown[]
  reset: unknown[]
  approve: unknown[]
}

/** Servidor em memória: cada ação muda a lista que o GET seguinte devolve. */
function openUsers(
  options: {
    lastAdminOnDeactivate?: boolean
    pendingRegistration?: boolean
  } = {},
) {
  const users: UserDto[] = [
    makeUserRow({ id: 'u-ana' }),
    makeUserRow({
      id: 'u-bruno',
      name: 'Bruno Lima',
      email: 'bruno@x.com',
      role: 'EDITOR',
    }),
    makeUserRow({
      id: 'u-carla',
      name: 'Carla Dias',
      email: 'carla@x.com',
      role: 'VIEWER',
      status: options.pendingRegistration ? 'PENDING' : 'DISABLED',
    }),
  ]
  const calls: Calls = { role: [], reset: [], approve: [] }
  const find = (id: unknown) => users.find((user) => user.id === id) as UserDto
  const view = renderApp('/configuracoes/usuarios', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      http.get('/api/users', () => HttpResponse.json(users)),
      http.patch('/api/users/:id/role', async ({ params, request }) => {
        const body = (await request.json()) as { role: UserDto['role'] }
        calls.role.push(body)
        const user = find(params.id)
        user.role = body.role
        return HttpResponse.json(user)
      }),
      http.post('/api/users/:id/reset-password', async ({ request }) => {
        calls.reset.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
      http.post('/api/users/:id/deactivate', ({ params }) => {
        if (options.lastAdminOnDeactivate) {
          return HttpResponse.json(
            { code: 'LAST_ADMIN', message: MESSAGES.lastAdmin },
            { status: 409 },
          )
        }
        const user = find(params.id)
        user.status = 'DISABLED'
        return HttpResponse.json(user)
      }),
      http.post('/api/users/:id/reactivate', ({ params }) => {
        const user = find(params.id)
        user.status = 'ACTIVE'
        return HttpResponse.json(user)
      }),
      http.post(
        '/api/users/:id/approve-registration',
        async ({ params, request }) => {
          calls.approve.push(await request.json())
          const user = find(params.id)
          user.status = 'ACTIVE'
          user.mustChangePassword = true
          return HttpResponse.json(user)
        },
      ),
    ],
  })
  return { ...view, calls }
}

async function openMenu(view: ReturnType<typeof openUsers>, name: string) {
  await view.user.click(
    await screen.findByRole('button', { name: `Ações de ${name}` }),
  )
}

/** A linha só entra na árvore de acessibilidade depois que o diálogo fecha. */
const rowOf = async (name: string) =>
  within(await screen.findByRole('row', { name: new RegExp(name) }))

describe('UserRowActions', () => {
  it('aprova o cadastro pendente com uma senha provisória', async () => {
    const view = openUsers({ pendingRegistration: true })
    expect(
      (await rowOf('Carla Dias')).getByText('Aguardando aprovação'),
    ).toBeInTheDocument()
    await openMenu(view, 'Carla Dias')
    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Aprovar cadastro' }),
    )
    const dialog = within(
      await screen.findByRole('dialog', {
        name: 'Aprovar cadastro de Carla Dias',
      }),
    )
    await view.user.type(
      dialog.getByLabelText('Senha provisória'),
      'provisoria-123',
    )
    await view.user.click(
      dialog.getByRole('button', { name: 'Aprovar cadastro' }),
    )
    expect((await rowOf('Carla Dias')).getByText('Ativo')).toBeInTheDocument()
    expect(view.calls.approve).toEqual([
      { temporaryPassword: 'provisoria-123' },
    ])
  })
  it('USR-08 Desativar pede confirmação com o nome', async () => {
    const view = openUsers()
    await openMenu(view, 'Bruno Lima')

    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Desativar' }),
    )

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Desativar Bruno Lima? A pessoa não conseguirá mais entrar.',
    )
  })

  it('USR-09 confirmar a desativação mostra Desativado', async () => {
    const view = openUsers()
    await openMenu(view, 'Bruno Lima')
    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Desativar' }),
    )

    await view.user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Desativar',
      }),
    )

    expect(
      await (await rowOf('Bruno Lima')).findByText('Desativado'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('USR-10 Reativar mostra Ativo', async () => {
    const view = openUsers()
    expect(
      await (await rowOf('Carla Dias')).findByText('Desativado'),
    ).toBeInTheDocument()
    await openMenu(view, 'Carla Dias')

    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Reativar' }),
    )

    expect(
      await (await rowOf('Carla Dias')).findByText('Ativo'),
    ).toBeInTheDocument()
    expect(
      (await rowOf('Carla Dias')).queryByText('Desativado'),
    ).not.toBeInTheDocument()
  })

  it('USR-11 mostra É preciso existir ao menos um administrador ativo', async () => {
    const view = openUsers({ lastAdminOnDeactivate: true })
    await openMenu(view, 'Ana Souza')
    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Desativar' }),
    )

    await view.user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Desativar',
      }),
    )

    expect(
      await screen.findByText(
        'É preciso existir ao menos um administrador ativo',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('USR-07 Redefinir senha envia a senha provisória', async () => {
    const view = openUsers()
    await openMenu(view, 'Bruno Lima')
    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Redefinir senha' }),
    )

    await view.user.type(
      await screen.findByLabelText('Senha provisória'),
      'provisoria-456',
    )
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Senha redefinida')).toBeInTheDocument()
    expect(view.calls.reset).toEqual([{ temporaryPassword: 'provisoria-456' }])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ROLE-05 trocar o papel mostra o novo papel na linha', async () => {
    const view = openUsers()
    await openMenu(view, 'Bruno Lima')
    await view.user.click(
      await screen.findByRole('menuitem', { name: 'Alterar papel' }),
    )

    await view.user.click(
      await screen.findByRole('combobox', { name: 'Papel' }),
    )
    await view.user.click(
      await screen.findByRole('option', { name: 'Visualizador' }),
    )
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await (await rowOf('Bruno Lima')).findByText('Visualizador'),
    ).toBeInTheDocument()
    expect(
      (await rowOf('Bruno Lima')).queryByText('Editor'),
    ).not.toBeInTheDocument()
    expect(view.calls.role).toEqual([{ role: 'VIEWER' }])
  })
})
