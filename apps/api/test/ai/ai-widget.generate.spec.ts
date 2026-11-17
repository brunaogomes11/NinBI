import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AiWidgetService,
  type GenerateInput,
} from '../../src/ai/ai-widget.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connectionSchemas } from '../../src/database/schema'
import { createConnection } from '../factories'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let current: Awaited<ReturnType<typeof setup>> | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  current?.chatModels.release()
  await current?.close()
  current = undefined
})

const VALID_CYPHER =
  'MATCH (p:Pedido) RETURN p.categoria AS categoria, count(p) AS total'

const reply = (cypher: string) =>
  JSON.stringify({
    cypher,
    visualization: 'BAR',
    mapping: {
      x: 'categoria',
      series: ['total'],
      stacked: false,
      horizontal: false,
    },
    title: 'Pedidos por categoria',
  })

async function setup() {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
    { name: 'Vendas', uri: 'neo4j://vendas.exemplo:7687' },
  )
  await test.db.insert(connectionSchemas).values({
    connectionId: connection.id,
    readAt: new Date('2026-01-01T12:00:00Z'),
    document: {
      labels: [
        {
          name: 'Pedido',
          properties: [{ name: 'categoria', types: ['String'], example: null }],
        },
      ],
      relationshipTypes: [],
    },
  })
  await admin.agent
    .put('/api/llm-config')
    .send({ provider: 'OPENAI', model: 'gpt-teste', apiKey: 'sk-teste-1234' })
    .expect(200)
  const service = test.app.get(AiWidgetService)
  const prepared = await service.prepare({
    userId: admin.user.id,
    role: admin.user.role,
    dashboardConnectionId: connection.id,
    body: {
      prompt: 'x',
      widgetId: '00000000-0000-4000-8000-000000000001',
      widget: { title: 'W', cypher: null, visualization: 'TABLE', config: {} },
    },
  })
  const input = (overrides: Partial<GenerateInput> = {}): GenerateInput => ({
    userId: admin.user.id,
    snapshot: prepared.snapshot,
    schema: prepared.schema,
    connectionId: connection.id,
    widget: {
      title: 'Total por mês',
      cypher: 'MATCH (n) RETURN count(n) AS total',
      visualization: 'TABLE',
      config: {},
    },
    prompt: 'total de pedidos por categoria',
    filters: [],
    purpose: 'assistant',
    signal: new AbortController().signal,
    ...overrides,
  })
  const result = { ...test, chatModels, service, input }
  current = result
  return result
}

const text = (messages: { content: unknown }[]) =>
  messages.map((m) => String(m.content)).join('\n')

describe('AiWidgetService.generate', () => {
  it('GEN-05 generate valida, executa e corrige o Cypher do widget', async () => {
    const t = await setup()
    t.chatModels.script(reply('MATCH (n) DELETE n'), reply(VALID_CYPHER))
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])
    const attempts: number[] = []

    const outcome = await t.service.generate(
      t.input({ onAttempt: (n) => attempts.push(n) }),
    )

    expect(outcome).toMatchObject({
      kind: 'done',
      attempts: 2,
      cypher: VALID_CYPHER,
      visualization: 'BAR',
    })
    const reads = t.neo4j.calls.filter((c) => c.method === 'read')
    expect(reads).toHaveLength(1)
    expect(reads[0]).toMatchObject({ cypher: VALID_CYPHER })
    expect(attempts).toEqual([1, 2])
  })

  it('CHAT-08 generate parte do widget atual e dos filtros', async () => {
    const t = await setup()
    t.chatModels.script(reply(VALID_CYPHER))
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    await t.service.generate(
      t.input({
        filters: [
          {
            label: 'Categoria',
            parameter: 'categoria',
            type: 'SINGLE_SELECT',
          },
        ],
      }),
    )

    const first = text(t.chatModels.calls[0] ?? [])
    expect(first).toContain('Total por mês')
    expect(first).toContain('MATCH (n) RETURN count(n) AS total')
    expect(first).toContain('$categoria')
  })

  it('generate dá failed depois de 4 tentativas com o último Cypher', async () => {
    const t = await setup()
    t.chatModels.script(
      reply('MATCH (n) DELETE n'),
      reply('MATCH (n) SET n.a = 1'),
      reply('MATCH (n) REMOVE n.a'),
      reply('MATCH (n) DETACH DELETE n'),
    )

    const outcome = await t.service.generate(t.input())

    expect(outcome).toMatchObject({
      kind: 'failed',
      attempts: 4,
      cypher: 'MATCH (n) DETACH DELETE n',
    })
    expect(t.chatModels.calls).toHaveLength(4)
  })

  it('generate dá provider_error na 1ª chamada sem nova tentativa', async () => {
    const t = await setup()
    t.chatModels.script(Object.assign(new Error('429'), { status: 429 }))

    const outcome = await t.service.generate(t.input())

    expect(outcome).toMatchObject({
      kind: 'provider_error',
      code: 'AI_PROVIDER_RATE_LIMIT',
    })
    expect(t.chatModels.calls).toHaveLength(1)
  })

  it('generate registra o log com purpose=assistant', async () => {
    const t = await setup()
    const logged: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      logged.push(String(message))
    })
    t.chatModels.script(reply(VALID_CYPHER))
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    await t.service.generate(t.input())

    const lines = logged.filter((line) => line.startsWith('ai call'))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('purpose=assistant')
  })
})
