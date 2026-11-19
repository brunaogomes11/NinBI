import type {
  AssistantAction,
  AssistantMessageDto,
  DashboardDto,
} from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const MESSAGES_URL = '/api/dashboards/d-1/assistant/messages'
const OPEN_KEY = 'ninbi-assistant-open'
const encoder = new TextEncoder()

let restoreSize: (() => void) | null = null
afterEach(() => {
  restoreSize?.()
  restoreSize = null
  vi.restoreAllMocks()
})
beforeEach(() => localStorage.clear())

const userMessage = (
  id: string,
  text: string,
  role: 'USER' | 'ASSISTANT' = 'USER',
): AssistantMessageDto => ({
  id,
  role,
  text,
  details:
    role === 'USER'
      ? null
      : {
          changes: [],
          notApplied: [],
          createdWidgets: 0,
          failedWidgets: [],
          discardedWidgets: 0,
        },
  createdAt: '2026-11-17T10:00:00Z',
})

const line = (event: object) => encoder.encode(`${JSON.stringify(event)}\n`)

function ndjson(events: object[]): Response {
  return new HttpResponse(
    events.map((event) => `${JSON.stringify(event)}\n`).join(''),
    { headers: { 'Content-Type': 'application/x-ndjson' } },
  )
}

interface Options {
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
  dashboard?: DashboardDto
  stored?: AssistantMessageDto[]
  path?: string
  post?: RequestHandler
}

function open(options: Options = {}) {
  const dashboard = options.dashboard ?? makeDashboard()
  return renderApp(options.path ?? '/dashboards/d-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: options.role ?? 'ADMIN' })),
      sidebarHandler([{ type: 'dashboard', id: 'd-1', name: 'Vendas' }]),
      connectionsHandler([makeConnection({ id: 'c-1', name: 'Vendas' })]),
      http.get('/api/ai/status', () => HttpResponse.json({ configured: true })),
      http.get('/api/dashboards/d-1', () => HttpResponse.json(dashboard)),
      http.post('/api/dashboards/:id/query', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.post('/api/dashboards/:id/widgets/:widgetId/run', () =>
        HttpResponse.json(makeQueryResult()),
      ),
      http.put(
        '/api/dashboards/d-1',
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(MESSAGES_URL, () => HttpResponse.json(options.stored ?? [])),
      ...(options.post ? [options.post] : []),
    ],
  })
}

const assistantButton = () =>
  screen.queryByRole('button', { name: 'Assistente' })

describe('Assistente na página do dashboard', () => {
  it('CHAT-01 Assistente abre e fecha o painel à direita', async () => {
    const { user } = open()
    await screen.findByText('Vendas por loja')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Assistente' }))
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    const grid = screen.getByText('Vendas por loja')
    expect(
      grid.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(assistantButton()).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Assistente' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(assistantButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('CHAT-02 janela flutuante mantém a largura da grade', async () => {
    restoreSize = mockElementSize(816, 600)
    const dashboard = makeDashboard({
      tabs: [
        {
          id: 't-1',
          name: 'Aba 1',
          widgets: [
            makeWidget({
              id: 'w-meio',
              title: 'Meio',
              layout: { x: 0, y: 0, w: 6, h: 3 },
            }),
          ],
        },
      ],
    })
    localStorage.setItem(OPEN_KEY, '1')
    open({ dashboard })
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    await screen.findByText('Meio')

    const main = document.querySelector(
      '[data-slot="dashboard-main"]',
    ) as HTMLElement
    expect(main).toHaveClass('min-w-0')
    expect(main).toHaveClass('flex-1')
    expect(main.parentElement).toHaveClass('flex')
    expect(panel.parentElement).toBe(document.body)
    expect(panel).toHaveClass('fixed')
    // metade das 12 colunas em 816 px: (816 - 16) / 2 = 400 px
    const card = screen
      .getByText('Meio')
      .closest('.react-grid-item') as HTMLElement
    expect(card.style.width).toBe('400px')
  })

  it('CHAT-03 painel volta aberto ou fechado como foi deixado neste navegador', async () => {
    const first = open()
    await screen.findByText('Vendas por loja')
    await first.user.click(
      await screen.findByRole('button', { name: 'Assistente' }),
    )
    await screen.findByRole('complementary', { name: 'Assistente' })
    first.unmount()

    const second = open()
    expect(
      await screen.findByRole('complementary', { name: 'Assistente' }),
    ).toBeInTheDocument()
    await second.user.click(screen.getByRole('button', { name: 'Assistente' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    second.unmount()

    open()
    await screen.findByText('Vendas por loja')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('CHAT-03 localStorage que lança erro não quebra a página', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { user } = open()
    await screen.findByText('Vendas por loja')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Assistente' }))
    expect(
      await screen.findByRole('complementary', { name: 'Assistente' }),
    ).toBeInTheDocument()
  })

  it('CHAT-04 enviar em visualização entra no modo de edição e aplica no rascunho', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    const done: AssistantAction = {
      type: 'update_widget',
      widgetId: 'w-1',
      title: 'Vendas em linha',
      result: null,
      error: null,
    }
    const { user } = open({
      post: http.post(MESSAGES_URL, () =>
        ndjson([
          {
            type: 'accepted',
            userMessage: userMessage('m-1', 'troque para linha'),
          },
          {
            type: 'done',
            reply: userMessage('m-2', 'Troquei.', 'ASSISTANT'),
            actions: [done],
          },
        ]),
      ),
    })
    await screen.findByText('Vendas por loja')
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()

    await user.type(
      await screen.findByLabelText('Mensagem'),
      'troque para linha',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Vendas em linha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(
      within(screen.getByRole('complementary')).getByText('Troquei.'),
    ).toBeInTheDocument()
  })

  it('CHAT-18 Assistente aparece só para Admin e Editor que podem editar', async () => {
    const readOnly = makeDashboard({
      permissions: { edit: false, delete: false, share: false },
    })
    const cases: Array<[Options, boolean]> = [
      [{ role: 'VIEWER', dashboard: readOnly }, false],
      // Visualizador com compartilhamento de edição: só `ai.use` esconde o controle
      [{ role: 'VIEWER', dashboard: makeDashboard() }, false],
      // Visualizador com compartilhamento de edição: só `ai.use` esconde o controle
      [{ role: 'VIEWER', dashboard: makeDashboard() }, false],
      [{ role: 'EDITOR', dashboard: readOnly }, false],
      [{ role: 'EDITOR' }, true],
      [{ role: 'ADMIN' }, true],
    ]
    for (const [options, visible] of cases) {
      const view = open(options)
      await screen.findByText('Vendas por loja')
      if (visible) {
        expect(
          await screen.findByRole('button', { name: 'Assistente' }),
        ).toBeInTheDocument()
      } else {
        expect(assistantButton()).not.toBeInTheDocument()
      }
      view.unmount()
    }
  })

  it('CHAT-25 Pedir à IA fica desabilitado em todos os widgets enquanto o assistente responde', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    const held: { stream: ReadableStreamDefaultController<Uint8Array> | null } =
      { stream: null }
    const { user } = open({
      path: '/dashboards/d-1?editar=1',
      post: http.post(
        MESSAGES_URL,
        () =>
          new HttpResponse(
            new ReadableStream<Uint8Array>({
              start(controller) {
                held.stream = controller
                controller.enqueue(
                  line({
                    type: 'accepted',
                    userMessage: userMessage('m-1', 'oi'),
                  }),
                )
              },
            }),
            { headers: { 'Content-Type': 'application/x-ndjson' } },
          ),
      ),
    })
    await screen.findByText('Vendas por loja')
    await user.type(await screen.findByLabelText('Mensagem'), 'oi')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Pensando...')

    const menu = 'Ações do widget Vendas por loja'
    await user.click(screen.getByRole('button', { name: menu }))
    expect(
      await screen.findByRole('menuitem', { name: /Pedir à IA/ }),
    ).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{Escape}')

    held.stream?.enqueue(
      line({
        type: 'done',
        reply: userMessage('m-2', 'Nada a mudar.', 'ASSISTANT'),
        actions: [],
      }),
    )
    held.stream?.close()
    await waitFor(() =>
      expect(screen.queryByText('Pensando...')).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: menu }))
    expect(
      await screen.findByRole('menuitem', { name: /Pedir à IA/ }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('CHAT-30 trocar de aba mantém o painel aberto e a conversa', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    const dashboard = makeDashboard({
      tabs: [
        { id: 't-1', name: 'Resumo', widgets: [makeWidget({ id: 'w-1' })] },
        {
          id: 't-2',
          name: 'Estoque',
          widgets: [makeWidget({ id: 'w-2', title: 'Estoque por depósito' })],
        },
      ],
    })
    const { user } = open({
      dashboard,
      stored: [
        userMessage('m-1', 'oi'),
        userMessage('m-2', 'Olá!', 'ASSISTANT'),
      ],
    })
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    await within(panel).findByText('Olá!')

    await user.click(screen.getByRole('tab', { name: 'Estoque' }))
    expect(await screen.findByText('Estoque por depósito')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Assistente' })).toBe(
      panel,
    )
    expect(within(panel).getByText('oi')).toBeInTheDocument()
    expect(within(panel).getByText('Olá!')).toBeInTheDocument()
  })

  it('HIST-02 reabrir o dashboard mostra a conversa', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    open({
      stored: [
        userMessage('m-1', 'primeira pergunta'),
        userMessage('m-2', 'primeira resposta', 'ASSISTANT'),
      ],
    })
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    const first = await within(panel).findByText('primeira pergunta')
    const second = within(panel).getByText('primeira resposta')
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  const REPLY_ACTION: AssistantAction = {
    type: 'update_widget',
    widgetId: 'w-1',
    title: 'Vendas em linha',
    result: null,
    error: null,
  }
  const replyPost = () =>
    http.post(MESSAGES_URL, () =>
      ndjson([
        {
          type: 'accepted',
          userMessage: userMessage('m-1', 'troque para linha'),
        },
        {
          type: 'done',
          reply: userMessage('m-2', 'Troquei.', 'ASSISTANT'),
          actions: [REPLY_ACTION],
        },
      ]),
    )

  it('HIST-09 respostas antigas aparecem sem Desfazer', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    const first = open({ post: replyPost() })
    await screen.findByText('Vendas por loja')
    await first.user.type(
      await screen.findByLabelText('Mensagem'),
      'troque para linha',
    )
    await first.user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(
      await screen.findByRole('button', { name: 'Desfazer' }),
    ).toBeInTheDocument()
    first.unmount()

    // reabre o dashboard: a conversa volta do servidor, sem o Desfazer
    open({
      stored: [
        userMessage('m-1', 'troque para linha'),
        userMessage('m-2', 'Troquei.', 'ASSISTANT'),
      ],
    })
    const panel = await screen.findByRole('complementary', {
      name: 'Assistente',
    })
    expect(await within(panel).findByText('Troquei.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
  })

  it('CHAT-26 falha ao salvar mantém o rascunho e Descartar preserva a conversa', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    const { user } = open({ post: replyPost() })
    await screen.findByText('Vendas por loja')
    await user.type(
      await screen.findByLabelText('Mensagem'),
      'troque para linha',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Vendas em linha')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Desfazer' }),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole('button', { name: 'Tentar salvar' }),
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Descartar' }))

    expect(await screen.findByText('Vendas por loja')).toBeInTheDocument()
    expect(screen.queryByText('Vendas em linha')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
    const panel = screen.getByRole('complementary', { name: 'Assistente' })
    expect(within(panel).getByText('troque para linha')).toBeInTheDocument()
    expect(within(panel).getByText('Troquei.')).toBeInTheDocument()
  })

  it('ASQ-12 a página passa a linguagem da conexão ao assistente', async () => {
    localStorage.setItem(OPEN_KEY, '1')
    const create = (id: string, cypher: string): AssistantAction => ({
      type: 'create_widget',
      tabId: 't-1',
      widgetId: id,
      title: id,
      cypher,
      visualization: 'TABLE',
      mapping: null,
      layout: { x: 0, y: 4, w: 4, h: 4 },
      result: makeQueryResult({ columns: ['n'], rows: [[`semente ${id}`]] }),
      error: null,
    })
    // Em SQL o `--` comenta o `$categoria` do primeiro widget, então o resultado da resposta
    // vira a prévia dele; o segundo usa o filtro e roda a consulta (FLT-20).
    const actions = [
      create('w-comentado', 'SELECT 1 AS n -- $categoria'),
      create('w-usado', 'SELECT 1 AS n WHERE categoria = $categoria'),
    ]
    const { user } = open({
      dashboard: makeDashboard({
        connectionType: 'POSTGRES',
        filters: [
          {
            id: '6b0c2f3e-6a52-4a63-9a40-9d1d6f5d1a11',
            label: 'Categoria',
            parameter: 'categoria',
            type: 'TEXT',
            options: null,
            defaultValue: null,
          },
        ],
      }),
      post: http.post(MESSAGES_URL, () =>
        ndjson([
          { type: 'accepted', userMessage: userMessage('m-1', 'crie widgets') },
          {
            type: 'done',
            reply: userMessage('m-2', 'Criei.', 'ASSISTANT'),
            actions,
          },
        ]),
      ),
    })
    await screen.findByText('Vendas por loja')

    await user.type(await screen.findByLabelText('Mensagem'), 'crie widgets')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('semente w-comentado')).toBeInTheDocument()
    expect(screen.queryByText('semente w-usado')).toBeNull()
  })
})
