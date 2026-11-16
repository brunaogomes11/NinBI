import { MESSAGES, type NewUserInput, type UserDto } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  makeUserRow,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

type Respond = (body: NewUserInput) => Response | Promise<Response>

/** Lista que cresce quando o POST dá certo, como o servidor real. */
function openUsers(respond?: Respond) {
  const users: UserDto[] = [makeUserRow()]
  const bodies: NewUserInput[] = []
  const view = renderApp('/configuracoes/usuarios', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      http.get('/api/users', () => HttpResponse.json(users)),
      http.post('/api/users', async ({ request }) => {
        const body = (await request.json()) as NewUserInput
        bodies.push(body)
        if (respond) return respond(body)
        const created = makeUserRow({
          id: 'u-new',
          name: body.name,
          email: body.email,
          role: body.role,
          mustChangePassword: true,
        })
        users.push(created)
        return HttpResponse.json(created, { status: 201 })
      }),
    ],
  })
  return { ...view, bodies }
}

async function openDialog(view: ReturnType<typeof openUsers>) {
  await view.user.click(
    await screen.findByRole('button', { name: 'Novo usuário' }),
  )
  return screen.findByRole('dialog')
}

async function fill(
  view: ReturnType<typeof openUsers>,
  values: { name: string; email: string; password: string },
) {
  await view.user.type(screen.getByLabelText('Nome'), values.name)
  await view.user.type(screen.getByLabelText('E-mail'), values.email)
  await view.user.type(
    screen.getByLabelText('Senha provisória'),
    values.password,
  )
}

describe('NewUserDialog', () => {
  it('USR-04 novo usuário enviado aparece na lista', async () => {
    const view = openUsers()
    await openDialog(view)

    await fill(view, {
      name: 'Bruno Lima',
      email: 'bruno@x.com',
      password: 'provisoria-123',
    })
    await view.user.click(screen.getByRole('combobox', { name: 'Papel' }))
    await view.user.click(await screen.findByRole('option', { name: 'Editor' }))
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    const table = within(await screen.findByRole('table'))
    expect(await table.findByText('Bruno Lima')).toBeInTheDocument()
    expect(table.getByText('bruno@x.com')).toBeInTheDocument()
    expect(view.bodies).toEqual([
      {
        name: 'Bruno Lima',
        email: 'bruno@x.com',
        role: 'EDITOR',
        temporaryPassword: 'provisoria-123',
      },
    ])
  })

  it('USR-05 mostra Já existe um usuário com este e-mail', async () => {
    const view = openUsers(() =>
      HttpResponse.json(
        { code: 'EMAIL_TAKEN', message: MESSAGES.emailTaken },
        { status: 409 },
      ),
    )
    await openDialog(view)

    await fill(view, {
      name: 'Outra Ana',
      email: 'ANA@x.com',
      password: 'provisoria-123',
    })
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('Já existe um usuário com este e-mail'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('USR-12 Salvar fica desabilitado durante o envio', async () => {
    const view = openUsers(async () => {
      await delay('infinite')
      return HttpResponse.json({}, { status: 201 })
    })
    await openDialog(view)

    await fill(view, {
      name: 'Bruno Lima',
      email: 'bruno@x.com',
      password: 'provisoria-123',
    })
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(),
    )
  })

  it('USR-14 nome longo mostra a mensagem no campo', async () => {
    const view = openUsers()
    await openDialog(view)

    await view.user.click(screen.getByLabelText('Nome'))
    await view.user.paste('a'.repeat(121))
    await view.user.type(screen.getByLabelText('E-mail'), 'bruno@x.com')
    await view.user.type(
      screen.getByLabelText('Senha provisória'),
      'provisoria-123',
    )
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('O nome pode ter no máximo 120 caracteres'),
    ).toBeInTheDocument()
    expect(view.bodies).toHaveLength(0)
  })
})
