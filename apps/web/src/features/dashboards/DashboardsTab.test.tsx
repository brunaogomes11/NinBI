import { MESSAGES, type Role } from '@ninbi/contracts'
import { screen, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  sidebarHandler,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const summaries = [
  {
    id: 'd-1',
    name: 'Vendas',
    ownerName: 'Ana Souza',
    connectionName: 'Varejo',
    updatedAt: '2026-11-16T17:30:00Z',
  },
  {
    id: 'd-2',
    name: 'Estoque',
    ownerName: 'Bruno Lima',
    connectionName: 'Logística',
    updatedAt: '2026-11-10T12:00:00Z',
  },
]

function open(
  path: string,
  role: Role = 'ADMIN',
  ...handlers: RequestHandler[]
) {
  return renderApp(path, {
    handlers: [
      ...handlers,
      setupStatusHandler(false),
      sessionHandler(makeUser({ role })),
      sidebarHandler(),
      connectionsHandler(),
      http.get('/api/dashboards', () => HttpResponse.json(summaries)),
    ],
  })
}

describe('DashboardsTab', () => {
  it('DASH-20 aba Dashboards mostra nome, dono, conexão e última alteração', async () => {
    const { user } = open('/configuracoes/conexoes')

    await user.click(await screen.findByRole('tab', { name: 'Dashboards' }))

    const rows = await screen.findAllByRole('row')
    expect(
      rows.slice(1).map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['Vendas', 'Ana Souza', 'Varejo', '16/11/2026, 14:30'],
      ['Estoque', 'Bruno Lima', 'Logística', '10/11/2026, 09:00'],
    ])
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Nome', 'Dono', 'Conexão', 'Última alteração'])
  })

  it('DASH-21 clicar no dashboard da aba Dashboards abre o dashboard com Editar', async () => {
    const other = makeDashboard({
      id: 'd-2',
      name: 'Estoque',
      ownerId: 'user-bruno',
      ownerName: 'Bruno Lima',
      permissions: { edit: true, delete: true },
    })
    const { user, router } = open(
      '/configuracoes/dashboards',
      'ADMIN',
      http.get('/api/dashboards/d-2', () => HttpResponse.json(other)),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    )

    await user.click(await screen.findByRole('link', { name: 'Estoque' }))

    expect(
      await screen.findByRole('button', { name: 'Editar' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboards/d-2')
  })

  it('DASH-22 Visualizador em configuracoes dashboards vê a página de permissão', async () => {
    for (const role of ['VIEWER', 'EDITOR'] as const) {
      const { unmount } = open('/configuracoes/dashboards', role)

      expect(
        await screen.findByText(MESSAGES.forbiddenPage),
      ).toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: 'Dashboards' })).toBeNull()
      unmount()
    }
  })
})
