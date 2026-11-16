import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  noSessionHandler,
  renderApp,
  setupStatusHandler,
} from '@/test/renderApp'

describe('InitialPasswordPage', () => {
  it('USR-06 login com senha provisória exige nova senha antes da página inicial', async () => {
    const bodies: unknown[] = []
    const { user, router } = renderApp('/entrar', {
      handlers: [
        setupStatusHandler(false),
        noSessionHandler(),
        http.post('/api/auth/login', () =>
          HttpResponse.json(makeUser({ mustChangePassword: true })),
        ),
        http.post('/api/auth/initial-password', async ({ request }) => {
          bodies.push(await request.json())
          return new HttpResponse(null, { status: 204 })
        }),
      ],
    })

    await user.type(await screen.findByLabelText('E-mail'), 'ana@x.com')
    await user.type(screen.getByLabelText('Senha'), 'provisoria-123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(
      await screen.findByRole('heading', { name: 'Definir nova senha' }),
    ).toBeInTheDocument()

    await router.navigate('/configuracoes/usuarios')
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/definir-senha'),
    )

    await user.type(
      await screen.findByLabelText('Nova senha'),
      'senha-nova-123',
    )
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-nova-123')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByRole('heading', { name: 'Nenhum dashboard ainda' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(bodies).toEqual([
      { newPassword: 'senha-nova-123', confirmPassword: 'senha-nova-123' },
    ])
  })
})
