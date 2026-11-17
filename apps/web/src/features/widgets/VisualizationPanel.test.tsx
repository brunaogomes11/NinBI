import {
  type DashboardDto,
  MESSAGES,
  type QueryResultDto,
  type WidgetDto,
} from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockElementSize } from '@/test/element-size'
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

let restore: () => void
beforeEach(() => {
  restore = mockElementSize(600, 300)
})
afterEach(() => restore())

const MONTHLY: QueryResultDto = makeQueryResult({
  columns: ['mes', 'vendas', 'custo'],
  rows: [
    ['jan', 1234.56, 800],
    ['fev', 2000, 900],
    ['mar', 1500, 1000],
  ],
})

const BY_STORE: QueryResultDto = makeQueryResult({
  columns: ['loja', 'total'],
  rows: [['Centro', 10]],
})

const LABELS = [
  'Tabela',
  'Lista',
  'Área',
  'Barras',
  'Linha',
  'Pizza',
  'Radar',
  'Radial',
  'KPI',
  'Mapa',
]

interface Spy {
  queries: { cypher: string }[]
  puts: Record<string, unknown>[]
}

function open(
  widgets: WidgetDto[] = [],
  resultFor: (cypher: string) => QueryResultDto = () => MONTHLY,
) {
  const spy: Spy = { queries: [], puts: [] }
  const dashboard: DashboardDto = makeDashboard({
    tabs: [{ id: 't-1', name: 'Aba 1', widgets }],
  })
  const handlers: RequestHandler[] = [
    setupStatusHandler(false),
    sessionHandler(makeUser()),
    sidebarHandler(),
    connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
    http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
    http.post('/api/dashboards/:id/query', async ({ request }) => {
      const body = (await request.json()) as { cypher: string }
      spy.queries.push(body)
      return HttpResponse.json(resultFor(body.cypher))
    }),
    http.put('/api/dashboards/:id', async ({ request }) => {
      spy.puts.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ ...dashboard, version: 2 })
    }),
  ]
  const app = renderApp('/dashboards/d-1?editar=1', { handlers })
  return { ...app, spy }
}

type App = ReturnType<typeof open>

async function newWidgetEditor(app: App) {
  await app.user.click(
    await screen.findByRole('button', { name: 'Novo widget' }),
  )
  return within(await screen.findByRole('dialog'))
}

async function savedWidgetEditor(app: App, title: string) {
  await app.user.click(
    await screen.findByRole('button', { name: `Ações do widget ${title}` }),
  )
  await app.user.click(
    await screen.findByRole('menuitem', { name: 'Editar widget' }),
  )
  return within(await screen.findByRole('dialog'))
}

async function pick(
  app: App,
  dialog: ReturnType<typeof within>,
  field: string,
  option: string,
) {
  await app.user.click(dialog.getByRole('combobox', { name: field }))
  await app.user.click(await screen.findByRole('option', { name: option }))
}

async function runQuery(app: App, dialog: ReturnType<typeof within>) {
  await app.user.type(
    dialog.getByRole('textbox', { name: 'Consulta Cypher' }),
    'MATCH (n) RETURN n',
  )
  await app.user.click(dialog.getByRole('button', { name: 'Executar' }))
  await waitFor(() =>
    expect(
      within(screen.getByRole('region', { name: 'Prévia' })).getByRole('table'),
    ).toBeInTheDocument(),
  )
}

const BAR_WIDGET = makeWidget({
  id: 'w-1',
  title: 'Barras',
  cypher: 'MATCH (m:Mes) RETURN m.nome AS mes, m.v AS vendas',
  visualization: 'BAR',
  config: {
    mapping: {
      x: 'mes',
      series: ['vendas'],
      stacked: false,
      horizontal: false,
    },
  },
})

describe('VisualizationPanel', () => {
  it('VIZ-01 seletor Visualização mostra as 10 opções na ordem', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    await app.user.click(dialog.getByRole('combobox', { name: 'Visualização' }))
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(LABELS)
  })

  it('VIZ-02 escolher a visualização com resultado mostra os campos com a sugestão', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    await runQuery(app, dialog)

    await pick(app, dialog, 'Visualização', 'Barras')
    expect(dialog.getByRole('combobox', { name: 'Eixo X' })).toHaveTextContent(
      'mes',
    )
    const series = dialog.getByRole('group', { name: 'Séries' })
    expect(
      within(series).getByRole('checkbox', { name: 'vendas' }),
    ).toBeChecked()
    expect(
      within(series).getByRole('checkbox', { name: 'custo' }),
    ).toBeChecked()
    expect(
      dialog.getByRole('checkbox', { name: 'Empilhado' }),
    ).toBeInTheDocument()
    expect(
      dialog.getByRole('checkbox', { name: 'Horizontal' }),
    ).toBeInTheDocument()

    await pick(app, dialog, 'Visualização', 'Pizza')
    expect(dialog.getByRole('checkbox', { name: 'Donut' })).toBeInTheDocument()
  })

  it('VIZ-09 mudar o mapeamento atualiza a prévia sem executar de novo', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    await runQuery(app, dialog)
    await pick(app, dialog, 'Visualização', 'Linha')

    const preview = within(screen.getByRole('region', { name: 'Prévia' }))
    await waitFor(() => expect(preview.getByText('custo')).toBeInTheDocument())

    const series = dialog.getByRole('group', { name: 'Séries' })
    await app.user.click(
      within(series).getByRole('checkbox', { name: 'custo' }),
    )
    await waitFor(() => expect(preview.queryByText('custo')).toBeNull())
    expect(app.spy.queries).toHaveLength(1)
  })

  it('VIZ-10 sem resultado os campos ficam desabilitados com Execute a consulta para escolher as colunas', async () => {
    const app = open([BAR_WIDGET])
    const dialog = await savedWidgetEditor(app, 'Barras')

    expect(
      dialog.getByRole('combobox', { name: 'Visualização' }),
    ).toHaveTextContent('Barras')
    expect(dialog.getByRole('combobox', { name: 'Eixo X' })).toBeDisabled()
    const series = dialog.getByRole('group', { name: 'Séries' })
    expect(
      within(series).getByRole('checkbox', { name: 'vendas' }),
    ).toBeDisabled()
    expect(dialog.getByText(MESSAGES.runQueryToMap)).toBeInTheDocument()
  })

  it('VIZ-11 Aplicar com campo obrigatório vazio mostra Escolha', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    await runQuery(app, dialog)
    await pick(app, dialog, 'Visualização', 'Mapa')

    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))

    expect(await dialog.findByText('Escolha Latitude')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('VIZ-16 editor de widget novo mostra Tabela', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    expect(
      dialog.getByRole('combobox', { name: 'Visualização' }),
    ).toHaveTextContent('Tabela')
  })

  it('VIZ-19 trocar Barras por Pizza substitui o mapeamento pela sugestão', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    await runQuery(app, dialog)
    await pick(app, dialog, 'Visualização', 'Barras')

    const series = dialog.getByRole('group', { name: 'Séries' })
    await app.user.click(
      within(series).getByRole('checkbox', { name: 'vendas' }),
    )
    expect(
      within(series).getByRole('checkbox', { name: 'vendas' }),
    ).not.toBeChecked()

    await pick(app, dialog, 'Visualização', 'Pizza')
    expect(
      dialog.getByRole('combobox', { name: 'Categoria' }),
    ).toHaveTextContent('mes')
    expect(dialog.getByRole('combobox', { name: 'Valor' })).toHaveTextContent(
      'vendas',
    )
  })

  it('VIZ-20 Cypher novo sem as colunas mapeadas mostra a mensagem no card', async () => {
    const app = open([BAR_WIDGET], (cypher) =>
      cypher.includes('loja') ? BY_STORE : MONTHLY,
    )
    await waitFor(() =>
      expect(
        document.querySelector('.recharts-bar-rectangle'),
      ).toBeInTheDocument(),
    )
    const dialog = await savedWidgetEditor(app, 'Barras')
    const cypher = dialog.getByRole('textbox', { name: 'Consulta Cypher' })
    await app.user.clear(cypher)
    await app.user.type(cypher, 'MATCH (l:Loja) RETURN l.nome AS loja')

    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))

    expect(
      await screen.findByText(
        'A visualização não combina com o resultado: a coluna mes não existe',
      ),
    ).toBeInTheDocument()
  })

  it('VIZ-15 Aplicar e Salvar gravam a visualização e o mapeamento', async () => {
    const app = open()
    const dialog = await newWidgetEditor(app)
    await runQuery(app, dialog)
    await pick(app, dialog, 'Visualização', 'Barras')

    await app.user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await app.user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(app.spy.puts).toHaveLength(1))
    const tabs = app.spy.puts[0]?.tabs as { widgets: WidgetDto[] }[]
    const widget = tabs[0]?.widgets[0]
    expect(widget?.visualization).toBe('BAR')
    expect(widget?.config).toEqual({
      mapping: {
        x: 'mes',
        series: ['vendas', 'custo'],
        stacked: false,
        horizontal: false,
      },
    })
  })
})
