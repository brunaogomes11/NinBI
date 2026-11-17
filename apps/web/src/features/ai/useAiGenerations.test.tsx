import { type AiWidgetEvent, MESSAGES } from '@ninbi/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { type ReactNode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type DashboardDraft, fromDto } from '@/features/dashboards/draft'
import { mockElementSize } from '@/test/element-size'
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
import { server } from '@/test/server'
import {
  type AiFailure,
  type UseAiGenerationsOptions,
  useAiGenerations,
} from './useAiGenerations'

const URL_PATH = '/api/dashboards/d-1/ai/widget'
const encoder = new TextEncoder()
const MAPPING = {
  x: 'categoria',
  series: ['total'],
  stacked: false,
  horizontal: false,
}

function ndjson(events: object[]): Response {
  const text = events.map((event) => `${JSON.stringify(event)}\n`).join('')
  return new HttpResponse(text, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

function doneEvent(
  overrides: Partial<Extract<AiWidgetEvent, { type: 'done' }>> = {},
) {
  return {
    type: 'done',
    attempts: 1,
    cypher:
      'MATCH (p:Produto) RETURN p.categoria AS categoria, count(*) AS total',
    visualization: 'BAR',
    mapping: MAPPING,
    title: 'Itens por categoria',
    result: makeQueryResult({
      columns: ['categoria', 'total'],
      rows: [
        ['A', 3],
        ['B', 5],
      ],
    }),
    ...overrides,
  }
}

const CATEGORIA = {
  id: 'f-categoria',
  label: 'Categoria',
  parameter: 'categoria',
  type: 'SINGLE_SELECT' as const,
  options: { source: 'STATIC' as const, values: ['Livros', 'Jogos'] },
  defaultValue: 'Livros',
}

function setup(
  dashboard = makeDashboard(),
  language?: UseAiGenerationsOptions['language'],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const failures: [string, AiFailure][] = []
  const hook = renderHook(
    ({ editing }: { editing: boolean }) => {
      const [draft, setDraft] = useState<DashboardDraft>(() =>
        fromDto(dashboard),
      )
      const ai = useAiGenerations({
        dashboardId: 'd-1',
        draft,
        setDraft: (change) => setDraft(change),
        editing,
        language,
        onFailed: (id, failure) => failures.push([id, failure]),
      })
      return { draft, setDraft, ai }
    },
    { wrapper, initialProps: { editing: true } },
  )
  return { ...hook, queryClient, failures }
}

function widgetOf(draft: DashboardDraft) {
  return draft.tabs[0].widgets[0]
}

/** Resposta que fica aberta até o cliente abortar; guarda se o signal abortou. */
function hangingHandler(state: { aborted: boolean }) {
  return http.post(URL_PATH, ({ request }) => {
    request.signal.addEventListener('abort', () => {
      state.aborted = true
    })
    const first = JSON.stringify({
      type: 'attempt',
      attempt: 1,
      maxAttempts: 4,
    })
    return new HttpResponse(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(`${first}\n`))
        },
      }),
      { headers: { 'Content-Type': 'application/x-ndjson' } },
    )
  })
}

describe('useAiGenerations', () => {
  it('AIQ-09 resultado da IA atualiza o widget no rascunho e semeia o resultado', async () => {
    let queryCalls = 0
    server.use(
      http.post(URL_PATH, () =>
        ndjson([{ type: 'attempt', attempt: 1, maxAttempts: 4 }, doneEvent()]),
      ),
      http.post('/api/dashboards/d-1/query', () => {
        queryCalls += 1
        return HttpResponse.json(makeQueryResult())
      }),
    )
    const { result, queryClient } = setup()
    await act(() => result.current.ai.start('w-1', 'itens por categoria'))
    const widget = widgetOf(result.current.draft)
    expect(widget.title).toBe('Itens por categoria')
    expect(widget.cypher).toContain('p.categoria')
    expect(widget.visualization).toBe('BAR')
    expect(widget.config).toEqual({ mapping: MAPPING })
    const seeded = queryClient.getQueryData<{ rows: unknown[] }>([
      'query',
      'd-1',
      'c-1',
      widget.cypher,
    ])
    expect(seeded?.rows).toEqual([
      ['A', 3],
      ['B', 5],
    ])
    expect(queryCalls).toBe(0)
    expect(result.current.ai.stateOf('w-1')).toEqual({})
  })

  it('AIQ-10 geração sem linhas atualiza o widget com resultado vazio', async () => {
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          doneEvent({
            visualization: 'TABLE',
            mapping: null,
            result: makeQueryResult({ columns: ['n'], rows: [] }),
          }),
        ]),
      ),
    )
    const { result, queryClient } = setup()
    await act(() => result.current.ai.start('w-1', 'nada'))
    const widget = widgetOf(result.current.draft)
    expect(widget.cypher).toContain('p.categoria')
    expect(
      queryClient.getQueryData<{ rows: unknown[] }>([
        'query',
        'd-1',
        'c-1',
        widget.cypher,
      ])?.rows,
    ).toEqual([])
  })

  it('AIQ-13 Cancelar aborta o pedido e deixa o widget como estava', async () => {
    const state = { aborted: false }
    server.use(hangingHandler(state))
    const { result } = setup()
    const before = result.current.draft
    act(() => {
      void result.current.ai.start('w-1', 'pedido')
    })
    await waitFor(() =>
      expect(result.current.ai.stateOf('w-1').running).toBeDefined(),
    )
    act(() => result.current.ai.cancel('w-1'))
    await waitFor(() => expect(state.aborted).toBe(true))
    expect(result.current.draft).toBe(before)
    expect(result.current.ai.stateOf('w-1')).toEqual({})
  })

  it('AIQ-17 schema não lido mostra a mensagem no painel', async () => {
    server.use(
      http.post(URL_PATH, () =>
        HttpResponse.json(
          { code: 'SCHEMA_NOT_READ', message: MESSAGES.aiSchemaNotRead },
          { status: 409 },
        ),
      ),
    )
    const { result } = setup()
    await act(() => result.current.ai.start('w-1', 'pedido'))
    expect(result.current.ai.stateOf('w-1').error?.message).toBe(
      'Leia o schema da conexão antes de usar a IA',
    )
  })

  it('AIQ-26 falha do provedor mantém o texto e o widget', async () => {
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'attempt', attempt: 1, maxAttempts: 4 },
          {
            type: 'provider_error',
            code: 'AI_PROVIDER_AUTH',
            message: MESSAGES.aiProviderAuth,
          },
        ]),
      ),
    )
    const { result } = setup()
    const before = result.current.draft
    await act(() => result.current.ai.start('w-1', 'meu pedido'))
    expect(result.current.ai.stateOf('w-1').error).toEqual({
      message: 'O provedor de IA recusou a chave configurada',
      prompt: 'meu pedido',
    })
    expect(result.current.draft).toBe(before)
  })

  it('AIQ-28 sair do modo de edição para a geração', async () => {
    const state = { aborted: false }
    server.use(hangingHandler(state))
    const { result, rerender } = setup()
    act(() => {
      void result.current.ai.start('w-1', 'pedido')
    })
    await waitFor(() =>
      expect(result.current.ai.stateOf('w-1').running).toBeDefined(),
    )
    rerender({ editing: false })
    await waitFor(() => expect(state.aborted).toBe(true))
    expect(result.current.ai.stateOf('w-1')).toEqual({})
  })

  it('AIQ-29 widget removido durante a geração descarta o resultado', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post(URL_PATH, async () => {
        await gate
        return ndjson([doneEvent()])
      }),
    )
    const { result } = setup()
    act(() => {
      void result.current.ai.start('w-1', 'pedido')
    })
    await waitFor(() =>
      expect(result.current.ai.stateOf('w-1').running).toBeDefined(),
    )
    act(() =>
      result.current.setDraft((draft) => ({
        ...draft,
        tabs: draft.tabs.map((tab) => ({ ...tab, widgets: [] })),
      })),
    )
    release()
    await waitFor(() => expect(result.current.ai.stateOf('w-1')).toEqual({}))
    expect(result.current.draft.tabs[0].widgets).toEqual([])
  })

  it('FIX-07 falha final mantém o widget do rascunho até Aplicar', async () => {
    const message = 'Somente consultas de leitura são permitidas'
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          {
            type: 'failed',
            attempts: 4,
            cypher: 'MATCH (x) DELETE x',
            message,
          },
        ]),
      ),
    )
    const { result, failures } = setup()
    const before = result.current.draft
    await act(() => result.current.ai.start('w-1', 'pedido'))
    expect(failures).toEqual([
      ['w-1', { cypher: 'MATCH (x) DELETE x', message }],
    ])
    expect(result.current.draft).toBe(before)
    expect(result.current.ai.stateOf('w-1')).toEqual({})
  })
})

describe('useAiGenerations com filtros', () => {
  it('FLT-20 pedido à IA leva os filtros do rascunho sem valores', async () => {
    const bodies: string[] = []
    server.use(
      http.post(URL_PATH, async ({ request }) => {
        bodies.push(await request.text())
        return ndjson([doneEvent()])
      }),
    )
    const { result } = setup(makeDashboard({ filters: [CATEGORIA] }))
    await act(() => result.current.ai.start('w-1', 'itens por categoria'))
    expect(JSON.parse(bodies[0] as string).filters).toEqual([
      { label: 'Categoria', parameter: 'categoria', type: 'SINGLE_SELECT' },
    ])
    expect(bodies[0]).not.toContain('Livros')
    expect(bodies[0]).not.toContain('Jogos')
  })

  it('FLT-20 Cypher gerado sem parâmetro de filtro mostra o resultado da IA sem nova execução', async () => {
    server.use(http.post(URL_PATH, () => ndjson([doneEvent()])))
    const { result, queryClient } = setup(
      makeDashboard({ filters: [CATEGORIA] }),
    )
    await act(() => result.current.ai.start('w-1', 'itens'))
    const widget = widgetOf(result.current.draft)
    expect(
      queryClient.getQueryData<{ rows: unknown[] }>([
        'query',
        'd-1',
        'c-1',
        widget.cypher,
      ])?.rows,
    ).toEqual([
      ['A', 3],
      ['B', 5],
    ])
  })

  it('FLT-20 Cypher gerado com parâmetro de filtro não semeia o resultado da IA', async () => {
    const cypher =
      'MATCH (p:Produto) WHERE p.categoria = $categoria RETURN p.categoria AS categoria, count(*) AS total'
    server.use(http.post(URL_PATH, () => ndjson([doneEvent({ cypher })])))
    const { result, queryClient } = setup(
      makeDashboard({ filters: [CATEGORIA] }),
    )
    await act(() => result.current.ai.start('w-1', 'itens'))
    expect(
      queryClient.getQueryData(['query', 'd-1', 'c-1', cypher]),
    ).toBeUndefined()
  })
})

describe('Pedir à IA com filtros na página', () => {
  let restoreSize: () => void
  beforeEach(() => {
    restoreSize = mockElementSize(600, 300)
  })
  afterEach(() => restoreSize())

  it('FLT-20 Cypher gerado com parâmetro de filtro executa com os valores atuais', async () => {
    const cypher =
      'MATCH (p:Produto) WHERE p.categoria = $categoria RETURN p.categoria AS categoria, count(*) AS total'
    const queries: Record<string, unknown>[] = []
    const { user } = renderApp('/dashboards/d-1?editar=1', {
      handlers: [
        http.get('/api/ai/status', () =>
          HttpResponse.json({ configured: true }),
        ),
        http.post(URL_PATH, () => ndjson([doneEvent({ cypher })])),
        setupStatusHandler(false),
        sessionHandler(makeUser({ role: 'ADMIN' })),
        sidebarHandler([{ type: 'dashboard', id: 'd-1', name: 'Vendas' }]),
        connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
        http.get('/api/dashboards/d-1', () =>
          HttpResponse.json(makeDashboard({ filters: [CATEGORIA] })),
        ),
        http.post('/api/dashboards/:id/query', async ({ request }) => {
          queries.push((await request.json()) as Record<string, unknown>)
          return HttpResponse.json(makeQueryResult())
        }),
      ],
    })
    await user.click(await screen.findByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: 'Jogos' }))
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações do widget Vendas por loja',
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: /Pedir à IA/ }),
    )
    await user.type(
      await screen.findByLabelText('Descreva o que você quer ver'),
      'itens por categoria',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() =>
      expect(
        queries.some(
          (body) =>
            body.cypher === cypher &&
            JSON.stringify(body.params) ===
              JSON.stringify({ categoria: 'Jogos' }),
        ),
      ).toBe(true),
    )
  })
})

describe('Resultado da IA por tipo de conexão', () => {
  let restoreSize: () => void
  beforeEach(() => {
    restoreSize = mockElementSize(600, 300)
  })
  afterEach(() => restoreSize())

  const SQL =
    'SELECT categoria, count(*) AS total FROM produto GROUP BY categoria -- $categoria'

  /** Pede a consulta à IA no dashboard e abre o widget gerado no editor. */
  async function expectAiSqlInEditor() {
    const { user } = renderApp('/dashboards/d-1?editar=1', {
      handlers: [
        http.get('/api/ai/status', () =>
          HttpResponse.json({ configured: true }),
        ),
        setupStatusHandler(false),
        sessionHandler(makeUser({ role: 'ADMIN' })),
        sidebarHandler([{ type: 'dashboard', id: 'd-1', name: 'Vendas' }]),
        connectionsHandler([
          makeConnection({ id: 'c-1', name: 'Vendas', type: 'POSTGRES' }),
        ]),
        http.get('/api/dashboards/d-1', () =>
          HttpResponse.json(makeDashboard({ connectionType: 'POSTGRES' })),
        ),
        http.post('/api/dashboards/:id/query', () =>
          HttpResponse.json(makeQueryResult()),
        ),
      ],
    })
    await user.click(
      await screen.findByRole('button', {
        name: 'Ações do widget Vendas por loja',
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: /Pedir à IA/ }),
    )
    await user.type(
      await screen.findByLabelText('Descreva o que você quer ver'),
      'itens por categoria',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Descreva o que você quer ver'),
      ).toBeNull(),
    )

    await user.click(
      await screen.findByRole('button', {
        name: 'Ações do widget Itens por categoria',
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Editar widget' }),
    )
    expect(
      await screen.findByRole('textbox', { name: 'Consulta SQL' }),
    ).toHaveValue(SQL)
  }

  it('SAI-07 resultado da IA abre no editor do tipo da conexão', async () => {
    // O `$categoria` no comentário só é parâmetro para o Cypher: em SQL o resultado da IA vale.
    server.use(http.post(URL_PATH, () => ndjson([doneEvent({ cypher: SQL })])))
    const { result, queryClient } = setup(
      makeDashboard({ filters: [CATEGORIA], connectionType: 'POSTGRES' }),
      'SQL',
    )
    await act(() => result.current.ai.start('w-1', 'itens'))
    expect(
      queryClient.getQueryData<{ rows: unknown[] }>([
        'query',
        'd-1',
        'c-1',
        SQL,
      ])?.rows,
    ).toEqual([
      ['A', 3],
      ['B', 5],
    ])

    const cypher = setup(makeDashboard({ filters: [CATEGORIA] }), 'CYPHER')
    await act(() => cypher.result.current.ai.start('w-1', 'itens'))
    expect(
      cypher.queryClient.getQueryData(['query', 'd-1', 'c-1', SQL]),
    ).toBeUndefined()

    // E no app a consulta abre no editor "Consulta SQL" com o texto da IA.
    await expectAiSqlInEditor()
  })

  it('SAI-07 consulta SQL gerada abre no editor Consulta SQL', async () => {
    server.use(http.post(URL_PATH, () => ndjson([doneEvent({ cypher: SQL })])))
    await expectAiSqlInEditor()
  })
})
