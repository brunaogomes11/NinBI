import { type DashboardDto, MESSAGES, type ResultValue } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

const URL_PATH = '/api/dashboards/d-1/ai/widget'
const encoder = new TextEncoder()
const GENERATED_CYPHER =
  'MATCH (p:Produto) RETURN p.categoria AS categoria, count(*) AS total'
const PROMPT = 'total de itens por categoria em barras'

let restoreSize: () => void
beforeEach(() => {
  restoreSize = mockElementSize(600, 300)
})
afterEach(() => restoreSize())

function ndjson(events: object[]): Response {
  const text = events.map((event) => `${JSON.stringify(event)}\n`).join('')
  return new HttpResponse(text, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

function doneEvent(
  rows: ResultValue[][] = [
    ['A', 3],
    ['B', 5],
  ],
) {
  return {
    type: 'done',
    attempts: 1,
    cypher: GENERATED_CYPHER,
    visualization: 'BAR',
    mapping: {
      x: 'categoria',
      series: ['total'],
      stacked: false,
      horizontal: false,
    },
    title: 'Itens por categoria',
    result: makeQueryResult({ columns: ['categoria', 'total'], rows }),
  }
}

const statusHandler = (configured: boolean) =>
  http.get('/api/ai/status', () => HttpResponse.json({ configured }))

function open(
  handlers: RequestHandler[],
  options: { path?: string; role?: 'ADMIN' | 'EDITOR' | 'VIEWER' } = {},
) {
  const dashboard: DashboardDto = makeDashboard()
  return renderApp(options.path ?? '/dashboards/d-1?editar=1', {
    handlers: [
      ...handlers,
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: options.role ?? 'ADMIN' })),
      sidebarHandler([{ type: 'dashboard', id: 'd-1', name: 'Vendas' }]),
      connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
    ],
  })
}

const MENU = 'Ações do widget Vendas por loja'

async function openAskPanel(user: ReturnType<typeof open>['user']) {
  await user.click(await screen.findByRole('button', { name: MENU }))
  await user.click(await screen.findByRole('menuitem', { name: /Pedir à IA/ }))
}

async function ask(user: ReturnType<typeof open>['user'], prompt = PROMPT) {
  await openAskPanel(user)
  await user.type(
    await screen.findByLabelText('Descreva o que você quer ver'),
    prompt,
  )
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
}

describe('Pedir à IA no card do widget', () => {
  it('AIQ-01 Pedir à IA envia o texto e o widget atual', async () => {
    const bodies: Record<string, unknown>[] = []
    const { user } = open([
      statusHandler(true),
      http.post(URL_PATH, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return ndjson([doneEvent()])
      }),
    ])

    await ask(user)

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({
      prompt: PROMPT,
      widgetId: 'w-1',
      widget: {
        title: 'Vendas por loja',
        cypher: 'MATCH (l:Loja) RETURN l.nome AS loja',
        visualization: 'TABLE',
        config: {},
      },
    })
  })

  it('AIQ-09 resultado da IA atualiza o widget no card e mostra o resultado', async () => {
    const { user, container } = open([
      statusHandler(true),
      http.post(URL_PATH, () => ndjson([doneEvent()])),
    ])

    await ask(user)

    expect(
      await screen.findByRole('heading', { name: 'Itens por categoria' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        container.querySelectorAll('.recharts-bar-rectangle').length,
      ).toBeGreaterThan(0),
    )
  })

  it('AIQ-10 geração sem linhas mostra A consulta não retornou dados', async () => {
    const { user } = open([
      statusHandler(true),
      http.post(URL_PATH, () => ndjson([doneEvent([])])),
    ])

    await ask(user)

    expect(await screen.findByText(MESSAGES.queryNoData)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Itens por categoria' }),
    ).toBeInTheDocument()
  })

  it('AIQ-11 Editar widget depois da geração mostra o Cypher gerado', async () => {
    const { user } = open([
      statusHandler(true),
      http.post(URL_PATH, () => ndjson([doneEvent()])),
    ])
    await ask(user)
    await screen.findByRole('heading', { name: 'Itens por categoria' })

    await user.click(
      screen.getByRole('button', {
        name: 'Ações do widget Itens por categoria',
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Editar widget' }),
    )

    const editor = await screen.findByLabelText('Consulta Cypher')
    expect(editor).toHaveValue(GENERATED_CYPHER)
    await user.type(editor, ' LIMIT 5')
    expect(editor).toHaveValue(`${GENERATED_CYPHER} LIMIT 5`)
  })

  it('AIQ-12 Pedir à IA fica desabilitado enquanto o widget gera', async () => {
    const first = JSON.stringify({
      type: 'attempt',
      attempt: 1,
      maxAttempts: 4,
    })
    const { user } = open([
      statusHandler(true),
      http.post(
        URL_PATH,
        () =>
          new HttpResponse(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(encoder.encode(`${first}\n`))
              },
            }),
            { headers: { 'Content-Type': 'application/x-ndjson' } },
          ),
      ),
    ])

    await ask(user)

    expect(
      await screen.findByText('Gerando... tentativa 1 de 4'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: MENU }))
    expect(
      await screen.findByRole('menuitem', { name: /Pedir à IA/ }),
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('AIQ-16 sem provedor Pedir à IA fica desabilitado com Nenhum provedor de IA configurado', async () => {
    const { user } = open([statusHandler(false)])

    await user.click(await screen.findByRole('button', { name: MENU }))

    const item = await screen.findByRole('menuitem', { name: /Pedir à IA/ })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(
      within(item).getByText('Nenhum provedor de IA configurado'),
    ).toBeInTheDocument()
  })

  it('AIQ-19 Pedir à IA aparece só para Admin e Editor em modo de edição', async () => {
    const outside = open([statusHandler(true)], { path: '/dashboards/d-1' })
    await screen.findByRole('heading', { name: 'Vendas por loja' })
    expect(screen.queryByRole('button', { name: MENU })).toBeNull()
    outside.unmount()

    for (const role of ['EDITOR', 'ADMIN'] as const) {
      const view = open([statusHandler(true)], { role })
      await view.user.click(await screen.findByRole('button', { name: MENU }))
      expect(
        await screen.findByRole('menuitem', { name: /Pedir à IA/ }),
      ).toBeInTheDocument()
      view.unmount()
    }

    // Visualizador não usa a IA (AIQ-19): nenhum item "Pedir à IA", com ou sem menu do widget.
    const viewer = open([statusHandler(true)], { role: 'VIEWER' })
    await screen.findByRole('heading', { name: 'Vendas por loja' })
    const menu = screen.queryByRole('button', { name: MENU })
    if (menu) await viewer.user.click(menu)
    expect(screen.queryByText(/Pedir à IA/)).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /Pedir à IA/ })).toBeNull()
    viewer.unmount()
  })

  it('FIX-06 falha final abre o editor com o último Cypher e o erro', async () => {
    const message = 'Somente consultas de leitura são permitidas'
    const puts: Record<string, unknown>[] = []
    const { user } = open([
      statusHandler(true),
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'attempt', attempt: 1, maxAttempts: 4 },
          {
            type: 'failed',
            attempts: 4,
            cypher: 'MATCH (n) RETURN n',
            message,
          },
        ]),
      ),
      http.put('/api/dashboards/d-1', async ({ request }) => {
        puts.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(makeDashboard({ version: 2 }))
      }),
    ])

    await ask(user)

    const dialog = await screen.findByRole('dialog', { name: 'Editar widget' })
    expect(within(dialog).getByLabelText('Consulta Cypher')).toHaveValue(
      'MATCH (n) RETURN n',
    )
    expect(within(dialog).getByText(message)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Aplicar' }))
    await user.click(await screen.findByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]).toMatchObject({
      tabs: [{ widgets: [{ cypher: 'MATCH (n) RETURN n' }] }],
    })
  })
})
