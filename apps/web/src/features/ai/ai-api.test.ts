import { type AiWidgetEvent, MESSAGES } from '@ninbi/contracts'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { server } from '@/test/server'
import { streamAiWidget } from './api'

const URL_PATH = '/api/dashboards/dash-1/ai/widget'
const BODY = {
  prompt: 'total por loja',
  widgetId: '11111111-1111-4111-8111-111111111111',
  widget: { title: 'W', cypher: null, visualization: 'TABLE', config: {} },
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

const done: AiWidgetEvent = {
  type: 'done',
  attempts: 2,
  cypher: 'MATCH (n) RETURN n',
  visualization: 'TABLE',
  mapping: null,
  title: 'T',
  result: { columns: ['n'], rows: [], truncated: false, rowLimit: 5000 },
}

describe('streamAiWidget', () => {
  it('AIQ-12 leitura do NDJSON entrega cada tentativa na ordem', async () => {
    const lines = [
      JSON.stringify({ type: 'attempt', attempt: 1, maxAttempts: 4 }),
      JSON.stringify({ type: 'attempt', attempt: 2, maxAttempts: 4 }),
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
    const events: AiWidgetEvent[] = []
    const last = await streamAiWidget(
      'dash-1',
      BODY,
      new AbortController().signal,
      (event) => events.push(event),
    )
    expect(events.map((event) => event.type)).toEqual([
      'attempt',
      'attempt',
      'done',
    ])
    expect(events[0]).toEqual({ type: 'attempt', attempt: 1, maxAttempts: 4 })
    expect(events[1]).toEqual({ type: 'attempt', attempt: 2, maxAttempts: 4 })
    expect(last).toEqual(done)
  })

  it('AIQ-12 resposta 409 vira ApiError com code e message', async () => {
    server.use(
      http.post(URL_PATH, () =>
        HttpResponse.json(
          { code: 'SCHEMA_NOT_READ', message: MESSAGES.aiSchemaNotRead },
          { status: 409 },
        ),
      ),
    )
    const error = await streamAiWidget(
      'dash-1',
      BODY,
      new AbortController().signal,
      () => {},
    ).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).code).toBe('SCHEMA_NOT_READ')
    expect((error as ApiError).message).toBe(MESSAGES.aiSchemaNotRead)
  })

  it('AIQ-12 corpo sem evento final lança a mensagem genérica', async () => {
    server.use(http.post(URL_PATH, () => streamOf([''])))
    const error = await streamAiWidget(
      'dash-1',
      BODY,
      new AbortController().signal,
      () => {},
    ).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    )
  })

  it('AIQ-12 abortar o signal rejeita com AbortError', async () => {
    server.use(
      http.post(URL_PATH, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return streamOf([])
      }),
    )
    const controller = new AbortController()
    const promise = streamAiWidget('dash-1', BODY, controller.signal, () => {})
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
