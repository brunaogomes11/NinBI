import { type McpToolDto, MESSAGES } from '@ninbi/contracts'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import { makeConnection } from '@/test/fixtures/connections'
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

const sourceId = 'a1111111-1111-4111-8111-111111111111'
const tool: McpToolDto = {
  name: 'list',
  enabled: true,
  inputSchema: { type: 'object', properties: { state: { type: 'string' } } },
  lists: ['chamados', 'equipes'].map((name) => ({
    path: [name],
    columns: [{ name: 'equipe', type: 'string' }],
  })),
}
const session = [
  setupStatusHandler(false),
  sessionHandler(makeUser()),
  sidebarHandler(),
]

async function editMcp(
  result = makeQueryResult({ columns: ['equipe'], rows: [['Suporte']] }),
) {
  const dashboard = makeDashboard({
    connectionId: null,
    connectionType: null,
    tabs: [{ id: 't-1', name: 'Aba 1', widgets: [] }],
  })
  const calls: unknown[] = []
  const app = renderApp('/dashboards/d-1?editar=1', {
    handlers: [
      ...session,
      http.get('/api/connections', () => HttpResponse.json([])),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.get('/api/mcp/connections', () =>
        HttpResponse.json([{ id: sourceId, name: 'Fonte A' }]),
      ),
      http.get(`/api/mcp/connections/${sourceId}/tools`, () =>
        HttpResponse.json([tool]),
      ),
      http.post('/api/dashboards/d-1/mcp/preview', async ({ request }) => {
        calls.push(await request.json())
        return HttpResponse.json(result)
      }),
    ],
  })
  await app.user.click(
    await screen.findByRole('button', { name: 'Novo widget' }),
  )
  const dialog = within(await screen.findByRole('dialog'))
  await dialog.findByRole('option', { name: 'Fonte A' })
  await app.user.selectOptions(dialog.getByLabelText('Conexão MCP'), sourceId)
  await dialog.findByRole('option', { name: 'list' })
  await app.user.selectOptions(dialog.getByLabelText('Ferramenta MCP'), 'list')
  return { ...app, dialog, calls }
}

it('MCP-19 editor configura manualmente conexão ferramenta e argumentos', async () => {
  const { user, dialog, calls } = await editMcp()
  await user.selectOptions(
    dialog.getByLabelText('Lista de saída'),
    '["chamados"]',
  )
  const args = dialog.getByLabelText('Argumentos (JSON)')
  await user.clear(args)
  await user.paste('{"state":"open"}')
  await user.click(dialog.getByRole('button', { name: 'Executar' }))
  expect(await dialog.findByText('Suporte')).toBeInTheDocument()
  expect(calls).toEqual([
    {
      call: {
        connectionId: sourceId,
        tool: 'list',
        listPath: ['chamados'],
        arguments: { state: 'open' },
        filterBindings: {},
      },
      params: {},
    },
  ])
})

it('Admin cadastra MCP no mesmo diálogo e lista do SQL e habilita ferramenta tabular', async () => {
  const endpoint = 'https://mcp.example/stream'
  const updates: unknown[] = []
  let current: {
    id: string
    name: string
    endpoint: string
    enabledTools: string[]
  }[] = []
  const { user } = renderApp('/configuracoes/conexoes', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: 'ADMIN' })),
      sidebarHandler(),
      http.get('/api/connections', () =>
        HttpResponse.json([
          makeConnection({ name: 'Banco SQL', type: 'POSTGRES' }),
        ]),
      ),
      http.get('/api/mcp/connections', () => HttpResponse.json(current)),
      http.post('/api/mcp/connections', async ({ request }) => {
        const values = (await request.json()) as {
          name: string
          endpoint: string
        }
        current = [{ id: sourceId, ...values, enabledTools: [] }]
        return HttpResponse.json(current[0], { status: 201 })
      }),
      http.get(`/api/mcp/connections/${sourceId}/tools`, () =>
        HttpResponse.json([
          {
            ...tool,
            enabled: current[0]?.enabledTools.includes(tool.name) ?? false,
          },
        ]),
      ),
      http.patch(`/api/mcp/connections/${sourceId}`, async ({ request }) => {
        const values = (await request.json()) as { enabledTools: string[] }
        updates.push(values)
        current = current.map((item) => ({ ...item, ...values }))
        return HttpResponse.json(current[0])
      }),
    ],
  })
  await user.click(await screen.findByRole('button', { name: 'Nova conexão' }))
  const dialog = within(
    await screen.findByRole('dialog', { name: 'Nova conexão' }),
  )
  await user.click(dialog.getByRole('combobox', { name: 'Tipo' }))
  expect(screen.getByRole('option', { name: 'PostgreSQL' })).toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'MCP' }))
  expect(dialog.queryByLabelText('Senha')).not.toBeInTheDocument()
  await user.type(dialog.getByLabelText('Nome'), 'Chamados')
  await user.type(dialog.getByLabelText('URL do servidor MCP'), endpoint)
  await user.click(dialog.getByRole('button', { name: 'Salvar' }))
  const checkbox = await screen.findByRole('checkbox', { name: 'list' })
  const table = within(screen.getByRole('table'))
  expect(
    table.getByRole('row', { name: /Banco SQL.*PostgreSQL/ }),
  ).toBeInTheDocument()
  expect(table.getByRole('row', { name: /Chamados.*MCP/ })).toHaveTextContent(
    endpoint,
  )
  expect(checkbox).not.toBeChecked()
  await user.click(checkbox)
  await waitFor(() => expect(checkbox).toBeChecked())
  expect(current).toEqual([
    { id: sourceId, name: 'Chamados', endpoint, enabledTools: ['list'] },
  ])
  expect(updates).toEqual([{ enabledTools: ['list'] }])
})

it('MCP-22 editor oferece as listas tipadas declaradas pela ferramenta', async () => {
  const { user, dialog } = await editMcp()
  const select = dialog.getByLabelText('Lista de saída')
  expect(
    within(select).getByRole('option', { name: 'chamados (equipe: string)' }),
  ).toBeInTheDocument()
  await user.selectOptions(select, '["equipes"]')
  expect(select).toHaveValue('["equipes"]')
})

function dashboardHandlers(
  onRun: (widget: string, params: unknown) => Response | Promise<Response>,
  override: Partial<ReturnType<typeof makeWidget>> = {},
) {
  const dashboard = makeDashboard({
    connectionId: null,
    connectionType: null,
    tabs: [
      {
        id: 't-1',
        name: 'Aba 1',
        widgets: [
          makeWidget({
            id: 'a',
            title: 'Fonte A',
            cypher: null,
            sourceKind: 'MCP',
            hasQuery: true,
            parameters: ['team'],
            ...override,
          }),
          makeWidget({
            id: 'b',
            title: 'Fonte B',
            cypher: null,
            sourceKind: 'MCP',
            hasQuery: true,
            parameters: [],
          }),
        ],
      },
    ],
    filters: [
      {
        id: 'f-1',
        label: 'Equipe',
        parameter: 'team',
        type: 'TEXT',
        defaultValue: null,
        options: null,
      },
    ],
  })
  return [
    ...session,
    http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
    http.post(
      '/api/dashboards/d-1/widgets/:widget/run',
      async ({ request, params }) =>
        onRun(String(params.widget), await request.json()),
    ),
  ]
}

function widgetCard(title: string) {
  const card = screen.getByRole('heading', { name: title }).parentElement
  if (!card) throw new Error('Card não encontrado')
  return within(card)
}

it('MCP-09 gráfico salvo mostra colunas quando a lista tipada está vazia', async () => {
  renderApp('/dashboards/d-1', {
    handlers: dashboardHandlers(
      () =>
        HttpResponse.json(
          makeQueryResult({
            columns: ['equipe', 'total'],
            columnTypes: ['string', 'integer'],
            rows: [],
          }),
        ),
      {
        visualization: 'BAR',
        config: { mapping: { x: 'equipe', series: ['total'] } },
      },
    ),
  })
  await screen.findByRole('heading', { name: 'Fonte A' })
  const empty = widgetCard('Fonte A')
  expect(await empty.findByText(MESSAGES.queryNoData)).toBeInTheDocument()
  expect(
    empty.getByRole('columnheader', { name: 'equipe' }),
  ).toBeInTheDocument()
  expect(empty.getByRole('columnheader', { name: 'total' })).toBeInTheDocument()
})

it('MCP-11 prévia de gráfico sinaliza que o resultado é parcial', async () => {
  const result = makeQueryResult({
    columns: ['equipe', 'total'],
    columnTypes: ['string', 'integer'],
    rows: [['Suporte', 8]],
    rowLimit: 1,
    truncated: true,
  })
  const { user, dialog } = await editMcp(result)
  await user.selectOptions(
    dialog.getByLabelText('Lista de saída'),
    '["chamados"]',
  )
  await user.click(dialog.getByRole('button', { name: 'Executar' }))
  await dialog.findByText('Suporte')
  await user.click(dialog.getByRole('combobox', { name: 'Visualização' }))
  await user.click(screen.getByRole('option', { name: /^Barras$/ }))
  const preview = within(dialog.getByRole('region', { name: 'Prévia' }))
  expect(preview.getByText(MESSAGES.rowsTruncated(1))).toBeInTheDocument()
  expect(preview.queryByRole('table')).not.toBeInTheDocument()
})

it('MCP-13 reabrir painel executa configuração persistida', async () => {
  let active = 0
  const handlers = dashboardHandlers((widget) =>
    HttpResponse.json(
      makeQueryResult({
        rows: [[widget === 'a' ? `Fonte ativa ${++active}` : 'Dados de B']],
      }),
    ),
  )
  const current = renderApp('/dashboards/d-1', { handlers })
  expect(await screen.findByText('Fonte ativa 1')).toBeInTheDocument()
  current.unmount()
  renderApp('/dashboards/d-1', { handlers })
  expect(await screen.findByText('Fonte ativa 2')).toBeInTheDocument()
})

it('MCP-14 filtro reexecuta apenas widget vinculado com o novo valor', async () => {
  const calls: [string, unknown][] = []
  let releaseOld: (() => void) | undefined
  let returnedOld = false
  const oldRequest = new Promise<void>((resolve) => {
    releaseOld = resolve
  })
  renderApp('/dashboards/d-1', {
    handlers: dashboardHandlers(async (widget, params) => {
      calls.push([widget, params])
      const team = (params as { params?: { team?: string } }).params?.team
      if (widget === 'a' && team === 'Suporte') {
        await oldRequest
        returnedOld = true
      }
      return HttpResponse.json(
        makeQueryResult({
          rows: [
            [widget === 'a' ? `Dados de ${team ?? 'Todas'}` : 'Dados de B'],
          ],
        }),
      )
    }),
  })
  await screen.findByText('Dados de B')
  const input = screen.getByRole('textbox', { name: 'Equipe' })
  try {
    fireEvent.change(input, { target: { value: 'Suporte' } })
    await waitFor(() =>
      expect(calls).toContainEqual(['a', { params: { team: 'Suporte' } }]),
    )
    fireEvent.change(input, { target: { value: 'Plataforma' } })
    const active = widgetCard('Fonte A')
    expect(await active.findByText('Dados de Plataforma')).toBeInTheDocument()
    releaseOld?.()
    await waitFor(() => expect(returnedOld).toBe(true))
    expect(active.getByText('Dados de Plataforma')).toBeInTheDocument()
    expect(active.queryByText('Dados de Suporte')).not.toBeInTheDocument()
    expect(calls.filter(([id]) => id === 'b')).toHaveLength(1)
  } finally {
    releaseOld?.()
  }
})

it('MCP-15 falha de uma fonte mantém outro widget disponível', async () => {
  renderApp('/dashboards/d-1', {
    handlers: dashboardHandlers((widget) =>
      widget === 'a'
        ? HttpResponse.json(
            { code: 'SOURCE_UNAVAILABLE', message: 'MCP offline' },
            { status: 502 },
          )
        : HttpResponse.json(makeQueryResult({ rows: [['Dados de B']] })),
    ),
  })
  await screen.findByRole('heading', { name: 'Fonte A' })
  const a = widgetCard('Fonte A')
  const b = widgetCard('Fonte B')
  expect(await a.findByRole('alert')).toHaveTextContent(
    MESSAGES.widgetLoadFailed,
  )
  expect(await b.findByText('Dados de B')).toBeInTheDocument()
  expect(b.queryByRole('alert')).not.toBeInTheDocument()
})
