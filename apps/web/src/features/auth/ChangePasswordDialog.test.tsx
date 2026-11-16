import { MESSAGES } from '@ninbi/contracts'
import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

async function openDialog(bodies: unknown[], status = 204) {
  const view = renderApp('/', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      http.post('/api/auth/password', async ({ request }) => {
        bodies.push(await request.json())
        if (status === 400) {
          return HttpResponse.json(
            {
              code: 'CURRENT_PASSWORD_INCORRECT',
              message: MESSAGES.currentPasswordIncorrect,
            },
            { status },
          )
        }
        return new HttpResponse(null, { status: 204 })
      }),
    ],
  })
  await view.user.click(
    await screen.findByRole('button', { name: /Ana Souza/ }),
  )
  await view.user.click(
    await screen.findByRole('menuitem', { name: 'Alterar senha' }),
  )
  await screen.findByRole('dialog')
  return view
}

async function fill(
  user: Awaited<ReturnType<typeof openDialog>>['user'],
  current: string,
  next: string,
  confirm = next,
) {
  await user.type(screen.getByLabelText('Senha atual'), current)
  await user.type(screen.getByLabelText('Nova senha'), next)
  await user.type(screen.getByLabelText('Confirmar nova senha'), confirm)
}

describe('ChangePasswordDialog', () => {
  it('PWD-01 Alterar senha mostra Senha alterada', async () => {
    const bodies: unknown[] = []
    const { user } = await openDialog(bodies)

    await fill(user, 'senha-atual-1', 'senha-nova-123')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Senha alterada')).toBeInTheDocument()
    expect(bodies).toEqual([
      { currentPassword: 'senha-atual-1', newPassword: 'senha-nova-123' },
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('PWD-02 mostra Senha atual incorreta', async () => {
    const bodies: unknown[] = []
    const { user } = await openDialog(bodies, 400)

    await fill(user, 'errada-123', 'senha-nova-123')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Senha atual incorreta')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('PWD-03 nova senha curta mostra a mensagem e não envia', async () => {
    const bodies: unknown[] = []
    const { user } = await openDialog(bodies)

    await fill(user, 'senha-atual-1', '1234567')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('A senha precisa ter ao menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(bodies).toHaveLength(0)
  })
})
