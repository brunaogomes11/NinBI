import {
  type AssistantAction,
  type AssistantMessageDto,
  type DashboardFilter,
  MESSAGES,
  type QueryLanguage,
} from '@ninbi/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { type ReactNode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { type DashboardDraft, fromDto } from '@/features/dashboards/draft'
import { makeDashboard, makeQueryResult } from '@/test/fixtures/dashboards'
import { server } from '@/test/server'
import { assistantQueryKey } from './api'
import { useAssistant } from './useAssistant'

const URL_PATH = '/api/dashboards/d-1/assistant/messages'
const encoder = new TextEncoder()

const userMessage = (
  id = 'u-1',
  text = 'crie uma aba',
): AssistantMessageDto => ({
  id,
  role: 'USER',
  text,
  details: null,
  createdAt: '2026-11-17T10:00:00Z',
})
const replyMessage = (id: string): AssistantMessageDto => ({
  id,
  role: 'ASSISTANT',
  text: 'Pronto.',
  details: {
    changes: [],
    notApplied: [],
    createdWidgets: 0,
    failedWidgets: [],
    discardedWidgets: 0,
  },
  createdAt: '2026-11-17T10:00:05Z',
})

const lines = (events: object[]) =>
  events.map((event) => `${JSON.stringify(event)}\n`).join('')

function ndjson(events: object[]): Response {
  return new HttpResponse(lines(events), {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

/** Envia os eventos dados e deixa a resposta aberta até o cliente abortar. */
function hangingHandler(
  events: object[],
  state: { aborted: boolean; requests: number },
) {
  return http.post(URL_PATH, ({ request }) => {
    state.requests += 1
    request.signal.addEventListener('abort', () => {
      state.aborted = true
    })
    return new HttpResponse(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(lines(events)))
        },
      }),
      { headers: { 'Content-Type': 'application/x-ndjson' } },
    )
  })
}

const createTab = (id: string): AssistantAction => ({
  type: 'create_tab',
  tabId: id,
  name: `Aba ${id}`,
})

const doneWith = (replyId: string, actions: AssistantAction[]) => ({
  type: 'done',
  reply: replyMessage(replyId),
  actions,
})

function setup(
  options: {
    draft?: DashboardDraft | null
    editing?: boolean
    language?: QueryLanguage
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(assistantQueryKey('d-1'), [])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const initial =
    options.draft === undefined ? fromDto(makeDashboard()) : options.draft
  const calls: string[] = []
  const hook = renderHook(
    ({ editing }: { editing: boolean }) => {
      const [draft, setDraft] = useState<DashboardDraft | null>(initial)
      const assistant = useAssistant({
        persist: async (snapshot) => snapshot,
        dashboardId: 'd-1',
        draft,
        setDraft: (change) => setDraft((current) => current && change(current)),
        ensureEditing: () => {
          calls.push('ensureEditing')
          setDraft((current) => current ?? fromDto(makeDashboard()))
        },
        editing,
        language: options.language,
      })
      return { draft, setDraft, assistant }
    },
    { wrapper, initialProps: { editing: options.editing ?? true } },
  )
  return { ...hook, queryClient, calls, initial }
}

describe('useAssistant', () => {
  it('GEN-09 Cancelar a geração aborta o pedido e deixa o rascunho como estava', async () => {
    const state = { aborted: false, requests: 0 }
    server.use(
      hangingHandler(
        [
          { type: 'accepted', userMessage: userMessage() },
          { type: 'planned', widgetsTotal: 3 },
          { type: 'widget', index: 1, total: 3, attempt: 1 },
        ],
        state,
      ),
    )
    const { result, initial } = setup()

    act(() => result.current.assistant.send('crie um painel'))
    await waitFor(() =>
      expect(result.current.assistant.progress).toEqual({
        index: 1,
        total: 3,
        attempt: 1,
      }),
    )
    expect(result.current.assistant.running).toBe(true)

    act(() => result.current.assistant.cancel())

    await waitFor(() => expect(state.aborted).toBe(true))
    expect(result.current.assistant.running).toBe(false)
    expect(result.current.draft).toBe(initial)
  })

  it('GEN-13 resultado da geração atualiza o rascunho e prepara a prévia', async () => {
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'accepted', userMessage: userMessage() },
          { type: 'planned', widgetsTotal: 1 },
          { type: 'widget', index: 1, total: 1, attempt: 1 },
          doneWith('r-1', [
            createTab('t-novo'),
            {
              type: 'create_widget',
              tabId: 't-novo',
              widgetId: 'w-novo',
              title: 'Total por loja',
              cypher: 'MATCH (l:Loja) RETURN l.nome AS loja',
              visualization: 'TABLE',
              mapping: null,
              layout: { x: 0, y: 0, w: 4, h: 4 },
              result: makeQueryResult(),
              error: null,
            },
          ]),
        ]),
      ),
    )
    const { result, queryClient } = setup()

    await act(async () => result.current.assistant.send('crie um painel'))
    await waitFor(() => expect(result.current.draft?.tabs).toHaveLength(2))

    const widget = result.current.draft?.tabs[1].widgets[0]
    expect(widget).toMatchObject({ id: 'w-novo', title: 'Total por loja' })
    // a prévia do widget nasce com o resultado que veio na resposta (AD-086)
    expect(
      queryClient.getQueryData(['query', 'd-1', 'c-1', widget?.cypher]),
    ).toEqual(makeQueryResult())
  })

  it('ASQ-13 filtros do assistente acham os widgets que usam o parâmetro em SQL', async () => {
    // em SQL o comentário `--` esconde o `$categoria`: o widget não usa o filtro e a prévia nasce
    // com o resultado da resposta; o widget que usa `$loja` de verdade fica sem prévia (FLT-20)
    const comment = 'SELECT 1 AS total -- $categoria'
    const used = 'SELECT 1 AS total WHERE loja = $loja'
    const widget = (id: string, query: string): AssistantAction => ({
      type: 'create_widget',
      tabId: 't-novo',
      widgetId: id,
      title: id,
      cypher: query,
      visualization: 'TABLE',
      mapping: null,
      layout: { x: 0, y: 0, w: 4, h: 4 },
      result: makeQueryResult(),
      error: null,
    })
    const filter = (parameter: string) =>
      ({
        id: `f-${parameter}`,
        label: parameter,
        parameter,
        type: 'TEXT',
        options: null,
        defaultValue: null,
      }) as unknown as DashboardFilter
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'accepted', userMessage: userMessage() },
          doneWith('r-1', [
            createTab('t-novo'),
            widget('w-comentario', comment),
            widget('w-usado', used),
          ]),
        ]),
      ),
    )
    const { result, queryClient } = setup({
      language: 'SQL',
      draft: fromDto(
        makeDashboard({ filters: [filter('categoria'), filter('loja')] }),
      ),
    })

    await act(async () => result.current.assistant.send('crie widgets'))
    await waitFor(() => expect(result.current.draft?.tabs).toHaveLength(2))

    expect(queryClient.getQueryData(['query', 'd-1', 'c-1', comment])).toEqual(
      makeQueryResult(),
    )
    expect(
      queryClient.getQueryData(['query', 'd-1', 'c-1', used]),
    ).toBeUndefined()
  })

  it('CHAT-10 hook oferece Desfazer só para a resposta mais recente que alterou o rascunho', async () => {
    const responses = [
      [
        { type: 'accepted', userMessage: userMessage('u-1') },
        doneWith('r-1', [createTab('t-a')]),
      ],
      [
        { type: 'accepted', userMessage: userMessage('u-2') },
        doneWith('r-2', []),
      ],
      [
        { type: 'accepted', userMessage: userMessage('u-3') },
        doneWith('r-3', [createTab('t-b')]),
      ],
    ]
    server.use(http.post(URL_PATH, () => ndjson(responses.shift() ?? [])))
    const { result } = setup()

    await act(async () => result.current.assistant.send('um'))
    await waitFor(() =>
      expect(result.current.assistant.undoMessageId).toBe('r-1'),
    )

    await act(async () => result.current.assistant.send('dois'))
    await waitFor(() => expect(responses).toHaveLength(1))
    await waitFor(() => expect(result.current.assistant.running).toBe(false))
    expect(result.current.assistant.undoMessageId).toBe('r-1')

    await act(async () => result.current.assistant.send('três'))
    await waitFor(() =>
      expect(result.current.assistant.undoMessageId).toBe('r-3'),
    )
  })

  it('CHAT-11 Desfazer devolve o rascunho ao estado anterior à resposta', async () => {
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'accepted', userMessage: userMessage() },
          doneWith('r-1', [createTab('t-a')]),
        ]),
      ),
    )
    const { result, initial } = setup()
    await act(async () => result.current.assistant.send('crie uma aba'))
    await waitFor(() => expect(result.current.draft?.tabs).toHaveLength(2))

    act(() => result.current.assistant.undo())

    expect(result.current.draft).toBe(initial)
    expect(result.current.assistant.undoMessageId).toBeNull()
  })

  it('CHAT-14 Cancelar durante a resposta aborta e não altera o rascunho', async () => {
    const state = { aborted: false, requests: 0 }
    server.use(
      hangingHandler([{ type: 'accepted', userMessage: userMessage() }], state),
    )
    const { result, initial } = setup()
    act(() => result.current.assistant.send('crie um painel'))
    await waitFor(() => expect(state.requests).toBe(1))
    expect(result.current.assistant.progress).toBeNull()

    act(() => result.current.assistant.cancel())

    await waitFor(() => expect(state.aborted).toBe(true))
    expect(result.current.draft).toBe(initial)
    expect(result.current.assistant.failure).toBeNull()
  })

  it('CHAT-21 falha do provedor mostra a mensagem e Tentar novamente reenvia a mesma mensagem', async () => {
    const bodies: { message: string; retryOf?: string }[] = []
    server.use(
      http.post(URL_PATH, async ({ request }) => {
        bodies.push(
          (await request.json()) as { message: string; retryOf?: string },
        )
        return ndjson([
          { type: 'accepted', userMessage: userMessage('u-9', 'oi') },
          {
            type: 'provider_error',
            code: 'AI_PROVIDER_AUTH',
            message: MESSAGES.aiProviderAuth,
          },
        ])
      }),
    )
    const { result } = setup()

    await act(async () => result.current.assistant.send('oi'))
    await waitFor(() =>
      expect(result.current.assistant.failure).toEqual({
        userMessageId: 'u-9',
        text: 'oi',
        message: 'O provedor de IA recusou a chave configurada',
      }),
    )

    await act(async () => result.current.assistant.retry())
    await waitFor(() => expect(bodies).toHaveLength(2))

    expect(bodies[0].retryOf).toBeUndefined()
    expect(bodies[1]).toMatchObject({ message: 'oi', retryOf: 'u-9' })
  })

  it('CHAT-22 falha do provedor depois do plano não altera o rascunho', async () => {
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'accepted', userMessage: userMessage() },
          { type: 'planned', widgetsTotal: 2 },
          { type: 'widget', index: 1, total: 2, attempt: 1 },
          {
            type: 'provider_error',
            code: 'AI_PROVIDER_RATE_LIMIT',
            message: MESSAGES.aiProviderRateLimit,
          },
        ]),
      ),
    )
    const { result, initial } = setup()

    await act(async () => result.current.assistant.send('crie um painel'))
    await waitFor(() =>
      expect(result.current.assistant.failure?.message).toBe(
        MESSAGES.aiProviderRateLimit,
      ),
    )

    expect(result.current.draft).toBe(initial)
    expect(result.current.assistant.undoMessageId).toBeNull()
  })

  it('CHAT-26 Descartar mantém a conversa e tira o Desfazer', async () => {
    server.use(
      http.post(URL_PATH, () =>
        ndjson([
          { type: 'accepted', userMessage: userMessage() },
          doneWith('r-1', [createTab('t-a')]),
        ]),
      ),
    )
    const { result, queryClient, initial } = setup()
    await act(async () => result.current.assistant.send('crie uma aba'))
    await waitFor(() =>
      expect(result.current.assistant.undoMessageId).toBe('r-1'),
    )

    // Descartar: o rascunho passa a ser o que está salvo
    act(() => result.current.setDraft(() => fromDto(makeDashboard())))

    expect(result.current.draft).not.toBe(initial)
    expect(result.current.assistant.undoMessageId).toBeNull()
    expect(
      queryClient
        .getQueryData<AssistantMessageDto[]>(assistantQueryKey('d-1'))
        ?.map((message) => message.id),
    ).toEqual(['u-1', 'r-1'])
  })

  it('CHAT-27 schema não lido mostra a mensagem na conversa', async () => {
    server.use(
      http.post(URL_PATH, () =>
        HttpResponse.json(
          { code: 'SCHEMA_NOT_READ', message: MESSAGES.aiSchemaNotRead },
          { status: 409 },
        ),
      ),
    )
    const { result, initial } = setup()

    await act(async () => result.current.assistant.send('crie um painel'))
    await waitFor(() =>
      expect(result.current.assistant.failure?.message).toBe(
        'Leia o schema da conexão antes de usar a IA',
      ),
    )

    expect(result.current.draft).toBe(initial)
  })

  it('CHAT-28 sair do dashboard para o pedido', async () => {
    const state = { aborted: false, requests: 0 }
    server.use(
      hangingHandler([{ type: 'accepted', userMessage: userMessage() }], state),
    )
    const first = setup()
    act(() => first.result.current.assistant.send('um'))
    await waitFor(() => expect(state.requests).toBe(1))

    // sair do modo de edição
    first.rerender({ editing: false })
    await waitFor(() => expect(state.aborted).toBe(true))
    expect(first.result.current.assistant.running).toBe(false)

    // desmontar a página
    state.aborted = false
    const second = setup()
    act(() => second.result.current.assistant.send('dois'))
    await waitFor(() => expect(state.requests).toBe(2))
    second.unmount()
    await waitFor(() => expect(state.aborted).toBe(true))
  })

  it('send chama ensureEditing antes do fetch', async () => {
    const order: string[] = []
    const { result, calls } = setup({ draft: null, editing: false })
    server.use(
      http.post(URL_PATH, () => {
        order.push(...calls, 'fetch')
        return ndjson([
          { type: 'accepted', userMessage: userMessage() },
          doneWith('r-1', []),
        ])
      }),
    )

    act(() => result.current.assistant.send('olá'))
    await waitFor(() => expect(order).toEqual(['ensureEditing', 'fetch']))
  })
})
