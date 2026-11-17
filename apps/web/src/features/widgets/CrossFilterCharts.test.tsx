import type {
  DashboardDto,
  QueryParamValue,
  WidgetVisualization,
} from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
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

const FILTER_ID = '6b0c2f3e-6a52-4a63-9a40-9d1d6f5d1a11'
const CYPHER = 'MATCH (c:Categoria) WHERE c.nome = $categoria RETURN c.nome'

let restoreSize: () => void
beforeEach(() => {
  restoreSize = mockElementSize(600, 300)
})
afterEach(() => restoreSize())

const FILTER = {
  id: FILTER_ID,
  label: 'Categoria',
  parameter: 'categoria',
  type: 'SINGLE_SELECT' as const,
  options: {
    source: 'STATIC' as const,
    values: ['Livros', 'Jogos', 'Eletrônicos'],
  },
  defaultValue: null,
}

const MAPPINGS: Record<string, Record<string, unknown>> = {
  BAR: { x: 'categoria', series: ['total'], stacked: false, horizontal: false },
  LINE: { x: 'categoria', series: ['total'] },
  AREA: { x: 'categoria', series: ['total'], stacked: false },
  PIE: { category: 'categoria', value: 'total', donut: false },
  RADAR: { axis: 'categoria', series: ['total'] },
  RADIAL: { category: 'categoria', value: 'total' },
}

const CATEGORIES = makeQueryResult({
  columns: ['categoria', 'total'],
  rows: [
    ['Livros', 10],
    ['Jogos', 20],
    ['Eletrônicos', 30],
  ],
})

interface Call {
  widgetId: string
  params: Record<string, QueryParamValue>
}

function dashboardFor(
  visualization: WidgetVisualization,
  withCrossFilter = true,
  defaultValue: string | null = null,
): DashboardDto {
  return makeDashboard({
    filters: [{ ...FILTER, defaultValue }],
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-chart',
            title: 'Categorias',
            cypher: 'MATCH (p) RETURN p',
            visualization,
            config: {
              mapping: MAPPINGS[visualization],
              ...(withCrossFilter && {
                crossFilter: { filterId: FILTER_ID, column: 'categoria' },
              }),
            },
          }),
          makeWidget({
            id: 'w-list',
            title: 'Lista',
            cypher: CYPHER,
            parameters: ['categoria'],
            visualization: 'TABLE',
            layout: { x: 4, y: 0, w: 4, h: 4 },
          }),
          makeWidget({
            id: 'w-kpi',
            title: 'Indicador',
            cypher: CYPHER,
            parameters: ['categoria'],
            visualization: 'TABLE',
            layout: { x: 8, y: 0, w: 4, h: 4 },
          }),
        ],
      },
    ],
  })
}

function open(dashboard: DashboardDto, path = '/dashboards/d-1') {
  const runs: Call[] = []
  const app = renderApp(path, {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      connectionsHandler(),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post(
        '/api/dashboards/:id/widgets/:widgetId/run',
        async ({ params, request }) => {
          const body = (await request.json()) as {
            params: Record<string, QueryParamValue>
          }
          runs.push({ widgetId: String(params.widgetId), params: body.params })
          return HttpResponse.json(CATEGORIES)
        },
      ),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(CATEGORIES),
      ),
    ],
  })
  return { ...app, runs }
}

type App = ReturnType<typeof open>

const element = (app: App, index: number) =>
  app.container.querySelector<HTMLElement | SVGElement>(
    `[data-row-index="${index}"]`,
  )

async function waitForElement(app: App, index: number) {
  await waitFor(() => expect(element(app, index)).not.toBeNull())
  return element(app, index) as HTMLElement
}

const categoria = () => screen.findByRole('combobox', { name: 'Categoria' })

describe('Ao clicar em gráficos', () => {
  it('XFL-02 clicar em barra, ponto, fatia, eixo de radar e barra radial define o filtro', async () => {
    for (const visualization of Object.keys(MAPPINGS)) {
      const app = open(dashboardFor(visualization as WidgetVisualization))
      const target = await waitForElement(app, 1)
      await app.user.click(target)
      await waitFor(async () =>
        expect(await categoria()).toHaveTextContent('Jogos'),
      )
      app.unmount()
    }
  })

  it('XFL-03 filtro definido por clique aparece na barra e executa os widgets que usam o parâmetro', async () => {
    const app = open(dashboardFor('BAR'))
    await waitFor(() => expect(app.runs).toHaveLength(3))
    app.runs.length = 0
    await app.user.click(await waitForElement(app, 0))

    expect(await categoria()).toHaveTextContent('Livros')
    await waitFor(() => expect(app.runs).toHaveLength(2))
    expect(app.runs.map((run) => run.widgetId).sort()).toEqual([
      'w-kpi',
      'w-list',
    ])
    for (const run of app.runs) {
      expect(run.params).toEqual({ categoria: 'Livros' })
    }
  })

  it('XFL-04 elemento selecionado fica destacado e os demais esmaecidos', async () => {
    const app = open(dashboardFor('BAR'))
    await app.user.click(await waitForElement(app, 0))
    await waitFor(() =>
      expect(element(app, 0)).toHaveAttribute('data-selected', 'true'),
    )
    expect(element(app, 1)).toHaveAttribute('data-dimmed', 'true')
    expect(element(app, 2)).toHaveAttribute('data-dimmed', 'true')
    expect(element(app, 1)).not.toHaveAttribute('data-selected')
  })

  it('XFL-05 clicar de novo no elemento esvazia o filtro e tira o destaque', async () => {
    const app = open(dashboardFor('BAR', true, 'Eletrônicos'))
    await waitFor(() => expect(app.runs).toHaveLength(3))
    await app.user.click(await waitForElement(app, 0))
    await waitFor(() =>
      expect(element(app, 0)).toHaveAttribute('data-selected', 'true'),
    )
    await waitFor(() => expect(app.runs).toHaveLength(5))
    app.runs.length = 0

    await app.user.click(element(app, 0) as HTMLElement)
    await waitFor(() =>
      expect(app.container.querySelector('[data-dimmed]')).toBeNull(),
    )
    expect(app.container.querySelector('[data-selected]')).toBeNull()
    await waitFor(() => expect(app.runs).toHaveLength(2))
    for (const run of app.runs) {
      expect(run.params).toEqual({ categoria: null })
    }
  })

  it('XFL-06 mudar o filtro pela barra remove o destaque', async () => {
    const app = open(dashboardFor('BAR'))
    await app.user.click(await waitForElement(app, 0))
    await waitFor(() =>
      expect(element(app, 0)).toHaveAttribute('data-selected', 'true'),
    )

    await app.user.click(await categoria())
    await app.user.click(await screen.findByRole('option', { name: 'Jogos' }))
    await waitFor(() =>
      expect(app.container.querySelector('[data-selected]')).toBeNull(),
    )
    expect(app.container.querySelector('[data-dimmed]')).toBeNull()
  })

  it('XFL-07 widget sem Ao clicar não muda filtro', async () => {
    const app = open(dashboardFor('BAR', false))
    await waitFor(() => expect(app.runs).toHaveLength(3))
    app.runs.length = 0
    await screen.findByRole('combobox', { name: 'Categoria' })
    expect(app.container.querySelector('[data-row-index]')).toBeNull()
    const bars = app.container.querySelectorAll('.recharts-bar-rectangle path')
    expect(bars.length).toBeGreaterThan(0)
    await app.user.click(bars[1] as Element)
    expect(await categoria()).not.toHaveTextContent('Jogos')
    expect(app.runs).toHaveLength(0)
  })

  it('XFL-08 modo de edição não muda filtro por clique', async () => {
    const app = open(dashboardFor('BAR'), '/dashboards/d-1?editar=1')
    await screen.findByRole('combobox', { name: 'Categoria' })
    await waitFor(() =>
      expect(
        app.container.querySelectorAll('.recharts-bar-rectangle path').length,
      ).toBeGreaterThan(0),
    )
    expect(app.container.querySelector('[data-row-index]')).toBeNull()
    const bars = app.container.querySelectorAll('.recharts-bar-rectangle path')
    await app.user.click(bars[1] as Element)
    expect(await categoria()).not.toHaveTextContent('Jogos')
  })
})
