import { MESSAGES } from '@ninbi/contracts'
import { screen, within } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  makeUserRow,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

function openUsers(handler: ReturnType<typeof http.get>) {
  return renderApp('/configuracoes/usuarios', {
    handlers: [setupStatusHandler(false), sessionHandler(makeUser()), handler],
  })
}

describe('UsersTab', () => {
  it('USR-01 aba Usuários mostra nome, e-mail, papel e situação', async () => {
    openUsers(
      http.get('/api/users', () =>
        HttpResponse.json([
          makeUserRow({
            id: 'u-2',
            name: 'bruno',
            email: 'bruno@x.com',
            role: 'EDITOR',
          }),
          makeUserRow({
            id: 'u-3',
            name: 'Carla',
            email: 'carla@x.com',
            role: 'VIEWER',
            status: 'DISABLED',
          }),
          makeUserRow({ id: 'u-1' }),
        ]),
      ),
    )

    await screen.findByText('bruno')
    const rows = screen.getAllByRole('row').slice(1)
    const cells = rows.map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    )
    expect(cells).toEqual([
      ['bruno', 'bruno@x.com', 'Editor', 'Ativo'],
      ['Carla', 'carla@x.com', 'Visualizador', 'Desativado'],
      ['Ana Souza', 'ana@x.com', 'Admin', 'Ativo'],
    ])
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Nome', 'E-mail', 'Papel', 'Situação'])
    expect(
      screen.getByRole('button', { name: 'Novo usuário' }),
    ).toBeInTheDocument()
  })

  it('USR-02 linhas de esqueleto durante o carregamento', async () => {
    const { container } = openUsers(
      http.get('/api/users', async () => {
        await delay('infinite')
        return HttpResponse.json([])
      }),
    )

    await screen.findByRole('columnheader', { name: 'Nome' })
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
    expect(
      within(screen.getByRole('table')).queryByText('Ana Souza'),
    ).not.toBeInTheDocument()
    expect(
      screen
        .getAllByRole('row')
        .slice(1)
        .every((row) => row.textContent === ''),
    ).toBe(true)
  })

  it('USR-03 erro mostra a mensagem e Tentar novamente recarrega', async () => {
    let calls = 0
    const { user } = openUsers(
      http.get('/api/users', () => {
        calls += 1
        if (calls === 1) {
          return HttpResponse.json(
            { code: 'INTERNAL_ERROR', message: MESSAGES.internalError },
            { status: 500 },
          )
        }
        return HttpResponse.json([
          makeUserRow({ name: 'Diego', email: 'd@x.com' }),
        ])
      }),
    )

    expect(
      await screen.findByText('Não foi possível carregar os usuários'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Diego')).toBeInTheDocument()
    expect(
      screen.queryByText('Não foi possível carregar os usuários'),
    ).not.toBeInTheDocument()
  })
})
