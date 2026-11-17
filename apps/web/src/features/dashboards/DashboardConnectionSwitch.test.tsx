import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
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

function open() {
  return renderApp('/dashboards/d-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      sidebarHandler(),
      connectionsHandler([
        makeConnection({ id: 'c-1', name: 'Vendas' }),
        makeConnection({ id: 'c-2', name: 'Estoque' }),
        makeConnection({
          id: 'c-3',
          name: 'Faturas',
          type: 'POSTGRES',
          uri: null,
          host: 'db.exemplo',
          port: 5432,
          database: 'faturas',
        }),
      ]),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(makeDashboard())),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    ],
  })
}

async function chooseConnection(
  user: ReturnType<typeof open>['user'],
  name: string,
) {
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  await user.click(await screen.findByRole('combobox', { name: 'Conexão' }))
  await user.click(await screen.findByRole('option', { name }))
}

describe('DashboardPage troca de conexão', () => {
  it('SMG-05 trocar para outro tipo pede confirmação', async () => {
    const { user } = open()

    await chooseConnection(user, 'Faturas')

    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('Trocar para Faturas (PostgreSQL)?'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        'As consultas estão escritas em Cypher e precisarão ser reescritas',
      ),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Trocar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('combobox', { name: 'Conexão' })).toHaveTextContent(
      'Faturas',
    )
  })

  it('SMG-06 Cancelar mantém a conexão anterior', async () => {
    const { user } = open()

    await chooseConnection(user, 'Faturas')
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('combobox', { name: 'Conexão' })).toHaveTextContent(
      'Vendas',
    )
  })

  it('SMG-07 trocar para o mesmo tipo não pergunta', async () => {
    const { user } = open()

    await chooseConnection(user, 'Estoque')

    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Conexão' }),
      ).toHaveTextContent('Estoque'),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
