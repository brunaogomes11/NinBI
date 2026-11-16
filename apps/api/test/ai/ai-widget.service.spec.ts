import { Logger } from '@nestjs/common'
import type { AiWidgetEvent } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type AiWidgetBody,
  AiWidgetService,
} from '../../src/ai/ai-widget.service'
import { AppError } from '../../src/common/app-error'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connectionSchemas, connections } from '../../src/database/schema'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import { createConnection } from '../factories'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let current: Awaited<ReturnType<typeof setup>> | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  current?.neo4j.release()
  current?.chatModels.release()
  await current?.close()
  current = undefined
})

const WIDGET_ID = '00000000-0000-4000-8000-000000000001'

const VALID_CYPHER =
  'MATCH (p:Pedido) RETURN p.categoria AS categoria, count(p) AS total'

const reply = (cypher: string, extra: Record<string, unknown> = {}) =>
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
    ...extra,
  })

const validReply = () => reply(VALID_CYPHER)
const writeReply = (clause = 'DELETE n') => reply(`MATCH (n) ${clause}`)

const body = (overrides: Partial<AiWidgetBody> = {}): AiWidgetBody => ({
  prompt: 'total de pedidos por categoria',
  widgetId: WIDGET_ID,
  widget: {
    title: 'Widget',
    cypher: null,
    visualization: 'TABLE',
    config: {},
  },
  ...overrides,
})

async function setup(options: { configured?: boolean; schema?: boolean } = {}) {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
    { name: 'Vendas', uri: 'neo4j://vendas.exemplo:7687' },
  )
  if (options.schema !== false) {
    await test.db.insert(connectionSchemas).values({
      connectionId: connection.id,
      readAt: new Date('2026-01-01T12:00:00Z'),
      document: {
        labels: [
          {
            name: 'Pedido',
            properties: [
              { name: 'categoria', types: ['String'], example: "'Bebidas'" },
            ],
          },
        ],
        relationshipTypes: [],
      },
    })
  }
  if (options.configured !== false) {
    await admin.agent
      .put('/api/llm-config')
      .send({
        provider: 'OPENAI',
        model: 'gpt-antigo',
        apiKey: 'sk-teste-1234',
      })
      .expect(200)
  }
  const service = test.app.get(AiWidgetService)
  const events: AiWidgetEvent[] = []
  const prepare = (b: AiWidgetBody = body()) =>
    service.prepare({
      userId: admin.user.id,
      dashboardConnectionId: connection.id,
      body: b,
    })
  const generate = async (b: AiWidgetBody = body()) => {
    const prepared = await prepare(b)
    await service.run(
      prepared,
      (e) => events.push(e),
      new AbortController().signal,
    )
    return events
  }
  const result = {
    ...test,
    chatModels,
    admin,
    connection,
    service,
    events,
    prepare,
    generate,
  }
  current = result
  return result
}

async function waitFor(condition: () => boolean) {
  for (let i = 0; i < 200 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  expect(condition()).toBe(true)
}

const text = (messages: { content: unknown }[]) =>
  messages.map((m) => String(m.content)).join('\n')

const reads = (t: { neo4j: { calls: { method: string }[] } }) =>
  t.neo4j.calls.filter((c) => c.method === 'read')

describe('AiWidgetService', () => {
  it('AIQ-07 Cypher gerado passa pela validação somente leitura e pelos limites', async () => {
    const t = await setup()
    const long = `MATCH (n) RETURN ${'x'.repeat(20001)}`
    t.chatModels.script(reply(long), validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    await t.generate()

    expect(reads(t)).toHaveLength(1)
    expect(reads(t)[0]).toMatchObject({ cypher: VALID_CYPHER })
    expect(text(t.chatModels.calls[1] ?? [])).toContain(
      'A consulta passa de 20.000 caracteres',
    )
  })

  it('AIQ-08 Cypher válido é executado na conexão do dashboard', async () => {
    const t = await setup()
    const other = await createConnection(t.db, t.app.get(CryptoService), {
      name: 'Estoque',
      uri: 'neo4j://estoque.exemplo:7687',
    })
    await t.db.insert(connectionSchemas).values({
      connectionId: other.id,
      readAt: new Date(),
      document: { labels: [], relationshipTypes: [] },
    })
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])
    t.chatModels.script(validReply(), validReply())

    await t.generate()
    expect(reads(t)[0]).toMatchObject({
      cfg: { uri: 'neo4j://vendas.exemplo:7687' },
    })

    await t.generate(body({ connectionId: other.id }))
    expect(reads(t)[1]).toMatchObject({
      cfg: { uri: 'neo4j://estoque.exemplo:7687' },
    })
  })

  it('AIQ-09 geração bem-sucedida devolve Cypher, visualização, mapeamento, título e resultado', async () => {
    const t = await setup()
    t.chatModels.script(validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [
      { categoria: 'A', total: 3 },
      { categoria: 'B', total: 5 },
    ])

    const events = await t.generate()

    const done = events.at(-1)
    expect(done).toMatchObject({
      type: 'done',
      attempts: 1,
      cypher: VALID_CYPHER,
      visualization: 'BAR',
      mapping: {
        x: 'categoria',
        series: ['total'],
        stacked: false,
        horizontal: false,
      },
      title: 'Pedidos por categoria',
      result: {
        columns: ['categoria', 'total'],
        rows: [
          ['A', 3],
          ['B', 5],
        ],
      },
    })
  })

  it('AIQ-10 resultado sem linhas conclui a geração', async () => {
    const t = await setup()
    t.chatModels.script(validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [])

    const events = await t.generate()

    expect(events.at(-1)).toMatchObject({
      type: 'done',
      attempts: 1,
      result: { rows: [] },
    })
    expect(t.chatModels.calls).toHaveLength(1)
  })

  it('AIQ-06 nenhuma linha de resultado nem mensagem de execução chega ao provedor', async () => {
    const t = await setup()
    t.chatModels.script(
      reply('MATCH (f:Falha) RETURN 1/0 AS x'),
      reply('MATCH (p:Pedido) RETURN p.id AS id'),
    )
    t.neo4j.whenRead(
      'MATCH (f:Falha)',
      new Neo4jGatewayError(
        '/ by zero VALOR-DE-ERRO-91c2',
        'Neo.ClientError.Statement.ArithmeticError',
      ),
    )
    t.neo4j.whenRead('MATCH (p:Pedido) RETURN p.id', [
      { id: 'VALOR-DE-LINHA-7f3a' },
    ])

    const events = await t.generate()

    expect(events.at(-1)).toMatchObject({ type: 'done', attempts: 2 })
    expect(t.chatModels.calls).toHaveLength(2)
    const sent = t.chatModels.calls.map(text).join('\n')
    expect(sent).not.toContain('VALOR-DE-LINHA-7f3a')
    expect(sent).not.toContain('VALOR-DE-ERRO-91c2')
    expect(sent).toContain('Neo.ClientError.Statement.ArithmeticError')
  })

  it('AIQ-13 cancelar para a geração sem nova chamada', async () => {
    const t = await setup()
    t.chatModels.script('hang', validReply())
    const prepared = await t.prepare()
    const first = new AbortController()
    const running = t.service.run(
      prepared,
      (e) => t.events.push(e),
      first.signal,
    )
    await waitFor(() => t.chatModels.calls.length === 1)
    first.abort()
    await running
    expect(t.events).toEqual([{ type: 'attempt', attempt: 1, maxAttempts: 4 }])
    expect(t.chatModels.calls).toHaveLength(1)

    t.events.length = 0
    t.chatModels.script(validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', 'hang')
    const second = new AbortController()
    const running2 = t.service.run(
      prepared,
      (e) => t.events.push(e),
      second.signal,
    )
    await waitFor(() => reads(t).length === 1)
    second.abort()
    await running2
    expect(t.events).toEqual([{ type: 'attempt', attempt: 1, maxAttempts: 4 }])
    expect(t.chatModels.calls).toHaveLength(2)
  })

  it('AIQ-17 conexão sem schema lido responde Leia o schema da conexão antes de usar a IA', async () => {
    const t = await setup({ schema: false })
    const error = await t.prepare().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      status: 409,
      code: 'SCHEMA_NOT_READ',
      message: 'Leia o schema da conexão antes de usar a IA',
    })

    await t.db.insert(connectionSchemas).values({
      connectionId: t.connection.id,
      readAt: new Date(),
      document: { labels: [], relationshipTypes: [] },
    })
    await t.db
      .update(connections)
      .set({ schemaStatus: 'READING' })
      .where(eq(connections.id, t.connection.id))
    await expect(t.prepare()).resolves.toMatchObject({
      connectionId: t.connection.id,
    })
  })

  it('AIQ-26 erro do provedor para a geração sem nova tentativa', async () => {
    const t = await setup()
    t.chatModels.script(
      Object.assign(new Error('Incorrect API key'), { status: 401 }),
      validReply(),
    )

    const events = await t.generate()

    expect(events).toEqual([
      { type: 'attempt', attempt: 1, maxAttempts: 4 },
      {
        type: 'provider_error',
        code: 'AI_PROVIDER_AUTH',
        message: 'O provedor de IA recusou a chave configurada',
      },
    ])
    expect(t.chatModels.calls).toHaveLength(1)
  })

  it('FIX-01 Cypher recusado ou com falha volta ao LLM com o erro', async () => {
    const t = await setup()
    const first = writeReply()
    t.chatModels.script(first, validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    const events = await t.generate()

    expect(events.at(-1)).toMatchObject({ type: 'done', attempts: 2 })
    const second = t.chatModels.calls[1] ?? []
    expect(second).toHaveLength(4)
    expect(String(second[2]?.content)).toBe(first)
    expect(String(second[3]?.content)).toContain(
      'Somente consultas de leitura são permitidas',
    )
  })

  it('FIX-02 no máximo 3 correções depois da primeira geração', async () => {
    const t = await setup()
    t.chatModels.script(
      writeReply(),
      writeReply(),
      writeReply(),
      writeReply(),
      validReply(),
    )

    const events = await t.generate()

    expect(t.chatModels.calls).toHaveLength(4)
    expect(events.filter((e) => e.type === 'attempt')).toHaveLength(4)
  })

  it('FIX-05 resposta sem Cypher conta como tentativa que falhou', async () => {
    const t = await setup()
    t.chatModels.script('Desculpe, não sei fazer isso.', validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    const events = await t.generate()

    expect(events.at(-1)).toMatchObject({ type: 'done', attempts: 2 })
    expect(text(t.chatModels.calls[1] ?? [])).toContain(
      'A resposta da IA não contém uma consulta Cypher',
    )
  })

  it('FIX-06 quarta falha devolve o último Cypher e o erro', async () => {
    const t = await setup()
    t.chatModels.script(
      writeReply('DELETE n'),
      writeReply('DELETE n'),
      writeReply('DELETE n'),
      writeReply('SET n.x = 1'),
    )

    const events = await t.generate()

    expect(events.at(-1)).toEqual({
      type: 'failed',
      attempts: 4,
      cypher: 'MATCH (n) SET n.x = 1',
      message:
        'Somente consultas de leitura são permitidas. Cláusula bloqueada: SET',
    })
  })

  it('FIX-08 correção que dá certo na terceira tentativa conclui a geração', async () => {
    const t = await setup()
    t.chatModels.script(writeReply(), writeReply(), validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    const events = await t.generate()

    expect(events.at(-1)).toMatchObject({ type: 'done', attempts: 3 })
    expect(events.some((e) => e.type === 'failed')).toBe(false)
  })

  it('FIX-09 pedido de escrita esgota as correções com Somente consultas de leitura são permitidas', async () => {
    const t = await setup()
    t.chatModels.script(writeReply(), writeReply(), writeReply(), writeReply())

    const events = await t.generate()

    const failed = events.at(-1)
    expect(failed).toMatchObject({ type: 'failed' })
    expect((failed as { message: string }).message).toContain(
      'Somente consultas de leitura são permitidas',
    )
    expect(reads(t)).toHaveLength(0)
  })

  it('FIX-10 várias instruções contam como falha de validação com Envie uma consulta por vez', async () => {
    const t = await setup()
    t.chatModels.script(
      reply('MATCH (n) RETURN n; MATCH (m) RETURN m'),
      validReply(),
    )
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])

    const events = await t.generate()

    expect(events.at(-1)).toMatchObject({ type: 'done', attempts: 2 })
    expect(text(t.chatModels.calls[1] ?? [])).toContain(
      'Envie uma consulta por vez',
    )
  })

  it('LLM-15 troca de configuração durante a geração não muda o modelo da geração', async () => {
    const t = await setup()
    const logged: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      logged.push(String(message))
    })
    t.chatModels.script('hang', 'sem cypher aqui', validReply())
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ categoria: 'A', total: 1 }])
    const prepared = await t.prepare()
    const running = t.service.run(
      prepared,
      (e) => t.events.push(e),
      new AbortController().signal,
    )
    await waitFor(() => t.chatModels.calls.length === 1)

    await t.admin.agent
      .put('/api/llm-config')
      .send({
        provider: 'ANTHROPIC',
        model: 'claude-novo',
        apiKey: 'sk-nova-9999',
      })
      .expect(200)
    t.chatModels.release()
    await running

    expect(t.events.at(-1)).toMatchObject({ type: 'done', attempts: 2 })
    expect(t.chatModels.created).toHaveLength(2)
    for (const snapshot of t.chatModels.created) {
      expect(snapshot).toMatchObject({
        provider: 'OPENAI',
        model: 'gpt-antigo',
      })
    }
    const aiLogs = logged.filter((line) => line.startsWith('ai call'))
    expect(aiLogs).toHaveLength(2)
    for (const line of aiLogs) expect(line).toContain('model=gpt-antigo')
  })

  it('NEO4J_UNAVAILABLE dá stopped sem nova chamada', async () => {
    const t = await setup()
    t.chatModels.script(validReply(), validReply())
    t.neo4j.whenRead(
      'MATCH (p:Pedido)',
      new Neo4jGatewayError('sem rota', 'ServiceUnavailable'),
    )

    const events = await t.generate()

    expect(events.at(-1)).toEqual({
      type: 'stopped',
      message: 'Não foi possível conectar ao banco Vendas',
    })
    expect(t.chatModels.calls).toHaveLength(1)
  })

  it('sem provedor dá 409 LLM_NOT_CONFIGURED', async () => {
    const t = await setup({ configured: false })
    const error = await t.prepare().catch((e: unknown) => e)
    expect(error).toMatchObject({
      status: 409,
      code: 'LLM_NOT_CONFIGURED',
      message: 'Nenhum provedor de IA configurado',
    })
  })
})
