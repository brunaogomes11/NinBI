import type { DashboardDto, QueryParamValue } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
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

interface Call {
  widgetId: string
  params: Record<string, QueryParamValue>
}

const CYPHER = 'MATCH (c:Categoria) WHERE c.nome = $categoria RETURN c.nome'

function dashboardWith(defaultValue: string | null): DashboardDto {
  return makeDashboard({
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-1',
            title: 'Vendas',
            cypher: CYPHER,
            parameters: ['categoria'],
          }),
          makeWidget({
            id: 'w-2',
            title: 'Estoque',
            cypher: CYPHER,
            parameters: ['categoria'],
          }),
          makeWidget({ id: 'w-3', title: 'Lojas', parameters: [] }),
        ],
      },
      {
        id: 't-2',
        name: 'Aba 2',
        widgets: [
          makeWidget({
            id: 'w-4',
            title: 'Pedidos',
            cypher: CYPHER,
            parameters: ['categoria'],
          }),
        ],
      },
    ],
    filters: [
      {
        id: 'f-categoria',
        label: 'Categoria',
        parameter: 'categoria',
        type: 'SINGLE_SELECT',
        options: { source: 'STATIC', values: ['Livros', 'Jogos'] },
        defaultValue,
      },
    ],
  })
}

/** Cada execução pode ficar presa até a pessoa do teste liberar a resposta daquele valor. */
function open(
  path: string,
  dashboard: DashboardDto,
  record: { runs: Call[]; queries: Array<Record<string, unknown>> },
  gates: Record<string, Promise<void>> = {},
) {
  return renderApp(path, {
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
          record.runs.push({
            widgetId: String(params.widgetId),
            params: body.params,
          })
          const key = String(body.params.categoria)
          await gates[key]
          return HttpResponse.json(
            makeQueryResult({
              columns: ['resultado'],
              rows: [[`Resultado ${key}`]],
            }),
          )
        },
      ),
      http.post('/api/dashboards/:id/query', async ({ request }) => {
        record.queries.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(makeQueryResult())
      }),
    ],
  })
}

async function choose(
  user: ReturnType<typeof renderApp>['user'],
  option: string,
) {
  await user.click(await screen.findByRole('combobox', { name: 'Categoria' }))
  await user.click(await screen.findByRole('option', { name: option }))
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

describe('filtros e execução dos widgets', () => {
  it('FLT-09 mudar o filtro executa de novo só os widgets que usam o parâmetro', async () => {
    const record = { runs: [] as Call[], queries: [] }
    const { user } = open('/dashboards/d-1', dashboardWith('Livros'), record)
    await waitFor(() => expect(record.runs).toHaveLength(3))
    record.runs.length = 0

    await choose(user, 'Jogos')
    await waitFor(() => expect(record.runs).toHaveLength(2))
    await settle()
    expect(record.runs.map((run) => run.widgetId).sort()).toEqual([
      'w-1',
      'w-2',
    ])
    for (const run of record.runs) {
      expect(run.params).toEqual({ categoria: 'Jogos' })
    }
  })

  it('FLT-10 abrir outra aba executa os widgets com os valores atuais', async () => {
    const record = { runs: [] as Call[], queries: [] }
    const { user } = open('/dashboards/d-1', dashboardWith('Livros'), record)
    await waitFor(() => expect(record.runs).toHaveLength(3))
    await choose(user, 'Jogos')
    await waitFor(() => expect(record.runs).toHaveLength(5))

    await user.click(screen.getByRole('tab', { name: 'Aba 2' }))
    await waitFor(() =>
      expect(record.runs.filter((run) => run.widgetId === 'w-4')).toEqual([
        { widgetId: 'w-4', params: { categoria: 'Jogos' } },
      ]),
    )
  })

  it('FLT-11 filtro vazio chega à execução como null', async () => {
    const record = { runs: [] as Call[], queries: [] }
    const { user } = open('/dashboards/d-1', dashboardWith('Livros'), record)
    await waitFor(() => expect(record.runs).toHaveLength(3))
    record.runs.length = 0

    await choose(user, 'Nenhum')
    await waitFor(() => expect(record.runs).toHaveLength(2))
    for (const run of record.runs) {
      expect(run.params).toEqual({ categoria: null })
    }
  })

  it('FLT-27 só o resultado do valor mais recente aparece', async () => {
    let releaseJogos = () => {}
    let releaseLivros = () => {}
    const gates = {
      Jogos: new Promise<void>((resolve) => {
        releaseJogos = resolve
      }),
      Livros: new Promise<void>((resolve) => {
        releaseLivros = resolve
      }),
    }
    const record = { runs: [] as Call[], queries: [] }
    const dashboard = dashboardWith(null)
    // um só widget com o parâmetro, para o texto do resultado ser inequívoco
    dashboard.tabs = [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'w-1',
            title: 'Vendas',
            cypher: CYPHER,
            parameters: ['categoria'],
          }),
        ],
      },
    ]
    const { user } = open('/dashboards/d-1', dashboard, record, {
      ...gates,
      null: Promise.resolve(),
    })
    await waitFor(() => expect(record.runs).toHaveLength(1))

    await choose(user, 'Jogos')
    await waitFor(() => expect(record.runs).toHaveLength(2))
    await choose(user, 'Livros')
    await waitFor(() => expect(record.runs).toHaveLength(3))

    // as respostas voltam fora de ordem: a de "Livros" primeiro, a de "Jogos" depois
    releaseLivros()
    expect(await screen.findByText('Resultado Livros')).toBeInTheDocument()
    releaseJogos()
    await settle()
    expect(screen.getByText('Resultado Livros')).toBeInTheDocument()
    expect(screen.queryByText('Resultado Jogos')).not.toBeInTheDocument()
  })

  it('FLT-09 em edição o widget do rascunho executa por query com os parâmetros dos filtros', async () => {
    const record = {
      runs: [] as Call[],
      queries: [] as Array<Record<string, unknown>>,
    }
    const { user } = open(
      '/dashboards/d-1?editar=1',
      dashboardWith('Livros'),
      record,
    )
    await waitFor(() =>
      expect(
        record.queries.some(
          (body) =>
            body.cypher === CYPHER &&
            JSON.stringify(body.params) ===
              JSON.stringify({ categoria: 'Livros' }),
        ),
      ).toBe(true),
    )
    await choose(user, 'Jogos')
    await waitFor(() =>
      expect(
        record.queries.some(
          (body) =>
            body.cypher === CYPHER &&
            JSON.stringify(body.params) ===
              JSON.stringify({ categoria: 'Jogos' }),
        ),
      ).toBe(true),
    )
    expect(record.runs).toHaveLength(0)
  })
})
