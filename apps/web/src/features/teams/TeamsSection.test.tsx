import { MESSAGES } from '@ninbi/contracts'
import { screen, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeTeam, teamsHandler } from '@/test/fixtures/teams'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function openUsers(teamsHandlerOverride: RequestHandler) {
  return renderApp('/configuracoes/usuarios', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      usersHandler([]),
      teamsHandlerOverride,
    ],
  })
}

describe('TeamsSection', () => {
  it('TEAM-01 seção Equipes mostra nome e número de membros na ordem da API', async () => {
    openUsers(
      teamsHandler([
        makeTeam({ id: 't-1', name: 'Ágil' }),
        makeTeam({
          id: 't-2',
          name: 'beta',
          members: [{ id: 'u-9', name: 'Dora', email: 'dora@x.com' }],
        }),
        makeTeam({ id: 't-3', name: 'zeta', members: [] }),
      ]),
    )

    await screen.findByText('Ágil')
    expect(
      screen.getByRole('heading', { name: MESSAGES.teamsTitle }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: MESSAGES.newTeam }),
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: MESSAGES.teamsTitle })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .slice(0, 2)
          .map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['Ágil', '2'],
      ['beta', '1'],
      ['zeta', '0'],
    ])
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Nome', 'Membros', 'Ações'])
  })

  it('TEAM-02 sem equipes mostra Nenhuma equipe criada', async () => {
    openUsers(teamsHandler([]))

    expect(await screen.findByText(MESSAGES.teamsEmpty)).toBeInTheDocument()
    expect(
      screen.queryByRole('table', { name: MESSAGES.teamsTitle }),
    ).toBeNull()
  })

  it('TEAM-10 erro nas equipes mostra Não foi possível carregar as equipes e Tentar novamente recarrega', async () => {
    let calls = 0
    const { user } = openUsers(
      http.get('/api/teams', () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 })
          : HttpResponse.json([makeTeam({ name: 'Comercial' })])
      }),
    )

    expect(
      await screen.findByText(MESSAGES.teamsLoadFailed),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Comercial')).toBeInTheDocument()
    expect(screen.queryByText(MESSAGES.teamsLoadFailed)).toBeNull()
  })
})
