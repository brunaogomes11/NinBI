import type { ConnectionType, DashboardFilter } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
  sidebarHandler,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const FILTERS: DashboardFilter[] = [
  {
    id: '6b0c2f3e-6a52-4a63-9a40-9d1d6f5d1a11',
    label: 'Categoria',
    parameter: 'categoria',
    type: 'SINGLE_SELECT',
    options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
    defaultValue: 'Jogos',
  },
  {
    id: '7c1d3a4f-7b63-4b74-8b51-0e2e7a6e2b22',
    label: 'Ignorado',
    parameter: 'ignorado',
    type: 'SINGLE_SELECT',
    options: { source: 'STATIC', values: ['x', 'y'] },
    defaultValue: 'x',
  },
]

const SQL =
  "SELECT categoria FROM produto WHERE categoria = $categoria AND nome <> '$ignorado' -- $ignorado"

function open(type: ConnectionType, query: string | null) {
  const queries: Array<Record<string, unknown>> = []
  const dashboard = makeDashboard({
    connectionType: type,
    filters: FILTERS,
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: query
          ? [makeWidget({ id: 'w-1', title: 'Produtos', cypher: query })]
          : [],
      },
    ],
  })
  const app = renderApp('/dashboards/d-1?editar=1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      sidebarHandler(),
      connectionsHandler([makeConnection({ id: 'c-1', type })]),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/query', async ({ request }) => {
        queries.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(makeQueryResult())
      }),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    ],
  })
  return { ...app, queries }
}

async function openNewWidget(app: ReturnType<typeof open>) {
  await app.user.click(
    await screen.findByRole('button', { name: 'Novo widget' }),
  )
  return within(await screen.findByRole('dialog'))
}

describe('WidgetEditorDialog por tipo de conexão', () => {
  it('SQX-01 editor de conexão SQL mostra Consulta SQL com destaque de SQL', async () => {
    const app = open('POSTGRES', null)
    const dialog = await openNewWidget(app)

    expect(dialog.queryByLabelText('Consulta Cypher')).not.toBeInTheDocument()
    await app.user.type(
      dialog.getByRole('textbox', { name: 'Consulta SQL' }),
      'SELECT nome FROM cliente WHERE id = $id -- feito',
    )

    const tokens = (kind: string) =>
      Array.from(document.querySelectorAll(`.token.${kind}`)).map(
        (token) => token.textContent,
      )
    expect(tokens('keyword')).toEqual(['SELECT', 'FROM', 'WHERE'])
    expect(tokens('variable')).toEqual(['$id'])
    expect(tokens('comment')).toEqual(['-- feito'])
  })

  it('SQX-02 editor de conexão Neo4j mostra Consulta Cypher', async () => {
    const app = open('NEO4J', null)
    const dialog = await openNewWidget(app)

    expect(
      dialog.getByRole('textbox', { name: 'Consulta Cypher' }),
    ).toBeInTheDocument()
    expect(dialog.queryByLabelText('Consulta SQL')).not.toBeInTheDocument()
  })

  it('SQX-16 parâmetros do widget SQL vêm do tokenizador SQL', async () => {
    const app = open('POSTGRES', SQL)
    await app.user.click(
      await screen.findByRole('button', { name: 'Ações do widget Produtos' }),
    )
    await app.user.click(
      await screen.findByRole('menuitem', { name: 'Editar widget' }),
    )
    const dialog = within(await screen.findByRole('dialog'))
    app.queries.length = 0

    await app.user.click(dialog.getByRole('button', { name: 'Executar' }))

    await waitFor(() => expect(app.queries).toHaveLength(1))
    expect(app.queries[0]).toMatchObject({
      cypher: SQL,
      params: { categoria: 'Jogos' },
    })
    expect(app.queries[0]?.params).not.toHaveProperty('ignorado')
  })
})
