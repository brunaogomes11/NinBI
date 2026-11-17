import {
  type AssistantEvent,
  type AssistantMessageDto,
  type AssistantRequest,
  MESSAGES,
} from '@ninbi/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { server } from '@/test/server'
import {
  assistantQueryKey,
  streamAssistant,
  useAssistantMessages,
  useClearAssistant,
} from './api'

const URL_PATH = '/api/dashboards/dash-1/assistant/messages'
const BODY: AssistantRequest = {
  message: 'crie uma aba',
  draft: {
    name: 'Painel',
    connectionId: '11111111-1111-4111-8111-111111111111',
    tabs: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Vendas',
        widgets: [],
      },
    ],
    filters: [],
  },
}
const encoder = new TextEncoder()

function streamOf(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

const userMessage: AssistantMessageDto = {
  id: 'm-1',
  role: 'USER',
  text: 'crie uma aba',
  details: null,
  createdAt: '2026-11-17T10:00:00Z',
}
const reply: AssistantMessageDto = {
  id: 'm-2',
  role: 'ASSISTANT',
  text: 'Pronto.',
  details: {
    changes: ['Aba criada: Lojas'],
    notApplied: [],
    createdWidgets: 0,
    failedWidgets: [],
    discardedWidgets: 0,
  },
  createdAt: '2026-11-17T10:00:05Z',
}

const wrapperFor =
  (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

describe('streamAssistant', () => {
  it('GEN-08 leitura do NDJSON entrega accepted, widget e done na ordem', async () => {
    const done: AssistantEvent = { type: 'done', reply, actions: [] }
    const lines = [
      JSON.stringify({ type: 'accepted', userMessage }),
      JSON.stringify({ type: 'widget', index: 1, total: 2, attempt: 1 }),
      JSON.stringify(done),
    ]
    const text = `${lines.join('\n')}\n`
    const cut = lines[0].length + 10 // parte a segunda linha ao meio
    server.use(
      http.post(URL_PATH, () =>
        streamOf([
          text.slice(0, cut),
          text.slice(cut, cut + 7),
          text.slice(cut + 7),
        ]),
      ),
    )
    const events: AssistantEvent[] = []

    const last = await streamAssistant(
      'dash-1',
      BODY,
      new AbortController().signal,
      (event) => events.push(event),
    )

    expect(events.map((event) => event.type)).toEqual([
      'accepted',
      'widget',
      'done',
    ])
    expect(events[1]).toEqual({
      type: 'widget',
      index: 1,
      total: 2,
      attempt: 1,
    })
    expect(last).toEqual(done)
  })

  it('GEN-08 resposta 409 SCHEMA_NOT_READ vira ApiError com code e message', async () => {
    server.use(
      http.post(URL_PATH, () =>
        HttpResponse.json(
          { code: 'SCHEMA_NOT_READ', message: MESSAGES.aiSchemaNotRead },
          { status: 409 },
        ),
      ),
    )

    const error = await streamAssistant(
      'dash-1',
      BODY,
      new AbortController().signal,
      () => {},
    ).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'SCHEMA_NOT_READ',
      message: MESSAGES.aiSchemaNotRead,
    })
  })

  it('GEN-08 abortar o signal rejeita com AbortError', async () => {
    server.use(
      http.post(URL_PATH, () => {
        const first = JSON.stringify({ type: 'planned', widgetsTotal: 1 })
        return new HttpResponse(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(`${first}\n`))
            },
          }),
          { headers: { 'Content-Type': 'application/x-ndjson' } },
        )
      }),
    )
    const abort = new AbortController()
    const seen: AssistantEvent[] = []

    const pending = streamAssistant('dash-1', BODY, abort.signal, (event) => {
      seen.push(event)
      abort.abort()
    }).catch((e: unknown) => e)

    const error = await pending
    expect(seen).toHaveLength(1)
    expect(error).toMatchObject({ name: 'AbortError' })
  })
})

describe('conversa do assistente', () => {
  it('GEN-08 useAssistantMessages lê a conversa na chave do dashboard', async () => {
    server.use(
      http.get(URL_PATH, () => HttpResponse.json([userMessage, reply])),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(() => useAssistantMessages('dash-1', true), {
      wrapper: wrapperFor(queryClient),
    })

    await waitFor(() =>
      expect(result.current.data).toEqual([userMessage, reply]),
    )
    expect(queryClient.getQueryData(assistantQueryKey('dash-1'))).toEqual([
      userMessage,
      reply,
    ])
  })

  it('GEN-08 useClearAssistant chama DELETE e esvazia o cache', async () => {
    let deleted = 0
    server.use(
      http.delete(URL_PATH, () => {
        deleted += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(assistantQueryKey('dash-1'), [userMessage, reply])

    const { result } = renderHook(() => useClearAssistant('dash-1'), {
      wrapper: wrapperFor(queryClient),
    })
    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(deleted).toBe(1)
    expect(queryClient.getQueryData(assistantQueryKey('dash-1'))).toEqual([])
  })
})
