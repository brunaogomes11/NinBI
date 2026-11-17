import type { DashboardFilter, DashboardSaveInput } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler } from '@/test/fixtures/connections'
import {
  makeDashboard,
  makeQueryResult,
  makeWidget,
} from '@/test/fixtures/dashboards'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

const CATEGORIA_ID = '6b0c2f3e-6a52-4a63-9a40-9d1d6f5d1a11'
const CYPHER =
  'MATCH (p:Produto) WHERE p.categoria = $categoria RETURN p.categoria AS categoria, count(*) AS total'

const FILTERS: DashboardFilter[] = [
  {
    id: CATEGORIA_ID,
    label: 'Categoria',
    parameter: 'categoria',
    type: 'SINGLE_SELECT',
    options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
    defaultValue: 'Jogos',
  },
  {
    id: '7c1d3a4f-7b63-4b74-8b51-0e2e7a6e2b22',
    label: 'Tags',
    parameter: 'tags',
    type: 'MULTI_SELECT',
    options: { source: 'STATIC', values: ['a', 'b'] },
    defaultValue: [],
  },
  {
    id: '8d2e4b5a-8c74-4c85-9c62-1f3f8b7f3c33',
    label: 'Dia',
    parameter: 'dia',
    type: 'DATE',
    options: null,
    defaultValue: null,
  },
]

function open() {
  const queries: Array<Record<string, unknown>> = []
  const puts: DashboardSaveInput[] = []
  const dashboard = makeDashboard({
    filters: FILTERS,
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-bar',
            title: 'Barras',
            cypher: CYPHER,
            parameters: ['categoria'],
            visualization: 'BAR',
            config: {
              mapping: {
                x: 'categoria',
                series: ['total'],
                stacked: false,
                horizontal: false,
              },
            },
          }),
          makeWidget({
            id: 'w-kpi',
            title: 'Total',
            cypher: 'MATCH (n) RETURN count(n) AS total',
            visualization: 'KPI',
            config: { mapping: { value: 'total' } },
            layout: { x: 4, y: 0, w: 4, h: 4 },
          }),
        ],
      },
    ],
  })
  const app = renderApp('/dashboards/d-1?editar=1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      connectionsHandler(),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/query', async ({ request }) => {
        queries.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(
          makeQueryResult({
            columns: ['categoria', 'total'],
            rows: [
              ['Livros', 3],
              ['Jogos', 5],
            ],
          }),
        )
      }),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.put('/api/dashboards/d-1', async ({ request }) => {
        puts.push((await request.json()) as DashboardSaveInput)
        return HttpResponse.json({ ...dashboard, version: 2 })
      }),
    ],
  })
  return { ...app, queries, puts }
}

async function openEditor(app: ReturnType<typeof open>, title: string) {
  await app.user.click(
    await screen.findByRole('button', { name: `Ações do widget ${title}` }),
  )
  await app.user.click(
    await screen.findByRole('menuitem', { name: 'Editar widget' }),
  )
  return within(await screen.findByRole('dialog'))
}

describe('WidgetEditorDialog com filtros', () => {
  it('FLT-19 Executar no editor envia os valores atuais dos filtros', async () => {
    const app = open()
    const dialog = await openEditor(app, 'Barras')
    app.queries.length = 0
    await app.user.click(dialog.getByRole('button', { name: 'Executar' }))
    await waitFor(() => expect(app.queries).toHaveLength(1))
    expect(app.queries[0]).toMatchObject({
      cypher: CYPHER,
      params: { categoria: 'Jogos' },
    })
  })

  it('XFL-01 editor oferece Ao clicar com filtro e coluna', async () => {
    const app = open()
    const dialog = await openEditor(app, 'Barras')
    const column = dialog.getByRole('combobox', { name: 'Coluna' })
    expect(column).toBeDisabled()

    await app.user.click(dialog.getByRole('button', { name: 'Executar' }))
    await waitFor(() => expect(column).toBeEnabled())

    await app.user.click(dialog.getByRole('combobox', { name: 'Filtro' }))
    const filterOptions = await screen.findAllByRole('option')
    expect(filterOptions.map((option) => option.textContent)).toEqual([
      'Nenhum',
      'Categoria',
      'Dia',
    ])
    await app.user.click(screen.getByRole('option', { name: 'Categoria' }))
    await app.user.click(dialog.getByRole('combobox', { name: 'Coluna' }))
    const columnOptions = await screen.findAllByRole('option')
    expect(columnOptions.map((option) => option.textContent)).toEqual([
      'categoria',
      'total',
    ])
    await app.user.click(screen.getByRole('option', { name: 'categoria' }))

    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await app.user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(app.puts).toHaveLength(1))
    const widget = app.puts[0]?.tabs[0]?.widgets.find((w) => w.id === 'w-bar')
    expect(widget?.config).toMatchObject({
      crossFilter: { filterId: CATEGORIA_ID, column: 'categoria' },
    })
  })

  it('XFL-01 widget KPI não mostra Ao clicar', async () => {
    const app = open()
    const dialog = await openEditor(app, 'Total')
    expect(dialog.queryByText('Ao clicar')).not.toBeInTheDocument()
  })
})
