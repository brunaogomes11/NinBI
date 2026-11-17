import type { AiWidgetEvent } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import {
  type AiWidgetBody,
  AiWidgetService,
} from '../../src/ai/ai-widget.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connectionSchemas } from '../../src/database/schema'
import { SourceGatewayError } from '../../src/sources/source'
import { createConnection } from '../factories'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let current: Awaited<ReturnType<typeof setup>> | undefined

afterEach(async () => {
  current?.chatModels.release()
  await current?.close()
  current = undefined
})

const VALID_SQL =
  'SELECT c.nome AS cliente, count(*) AS total FROM public.pedidos p JOIN public.clientes c ON c.id = p.cliente_id GROUP BY c.nome'

const reply = (query: string) =>
  JSON.stringify({
    cypher: query,
    visualization: 'BAR',
    mapping: {
      x: 'cliente',
      series: ['total'],
      stacked: false,
      horizontal: false,
    },
    title: 'Pedidos por cliente',
  })

const body: AiWidgetBody = {
  prompt: 'total de pedidos por cliente',
  widgetId: '00000000-0000-4000-8000-000000000001',
  widget: { title: 'Widget', cypher: null, visualization: 'TABLE', config: {} },
}

async function setup() {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
    { name: 'Sortify', type: 'POSTGRES' },
  )
  await test.db.insert(connectionSchemas).values({
    connectionId: connection.id,
    readAt: new Date('2026-01-01T12:00:00Z'),
    document: {
      kind: 'RELATIONAL',
      tables: [
        {
          name: 'public.clientes',
          isView: false,
          columns: [{ name: 'id', type: 'integer', example: '1' }],
        },
      ],
      foreignKeys: [],
    },
  })
  await admin.agent
    .put('/api/llm-config')
    .send({ provider: 'OPENAI', model: 'gpt-antigo', apiKey: 'sk-teste-1234' })
    .expect(200)
  const service = test.app.get(AiWidgetService)
  const events: AiWidgetEvent[] = []
  const generate = async () => {
    const prepared = await service.prepare({
      userId: admin.user.id,
      role: admin.user.role,
      dashboardConnectionId: connection.id,
      body,
    })
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
    connection,
    events,
    generate,
    pg: test.sql.POSTGRES,
  }
  current = result
  return result
}

const text = (messages: { content: unknown }[]) =>
  messages.map((m) => String(m.content)).join('\n')

describe('IA com conexão SQL', () => {
  it('SAI-04 consulta SQL do modelo passa pelo validador antes de executar', async () => {
    const t = await setup()
    t.chatModels.script(
      reply('SELECT * INTO copia FROM public.clientes'),
      reply('MATCH (n) RETURN n'),
      reply(VALID_SQL),
    )
    t.pg.whenRead('FROM public.pedidos', [
      { cliente: 'Ana', total: 3 },
      { cliente: 'Bia', total: 1 },
    ])

    const events = await t.generate()

    // As duas recusadas não chegam ao banco.
    expect(t.pg.reads).toEqual([VALID_SQL])
    const first = text(t.chatModels.calls[0] ?? [])
    expect(first).toContain('Você escreve consultas PostgreSQL')
    expect(first).toContain('public.clientes')
    expect(text(t.chatModels.calls[1] ?? [])).toContain(
      'Somente consultas de leitura são permitidas. Cláusula bloqueada: INTO',
    )
    expect(text(t.chatModels.calls[2] ?? [])).toContain(
      'Somente consultas de leitura são permitidas. Comece por SELECT ou WITH',
    )
    expect(events.at(-1)).toMatchObject({
      type: 'done',
      attempts: 3,
      cypher: VALID_SQL,
      result: {
        columns: ['cliente', 'total'],
        rows: [
          ['Ana', 3],
          ['Bia', 1],
        ],
      },
    })
  })

  it('SAI-05 consulta SQL que falha pede correção com o erro do banco', async () => {
    const t = await setup()
    t.chatModels.script(
      reply('SELECT nme FROM public.clientes'),
      reply('SELECT 1/0 AS x FROM public.clientes'),
      reply(VALID_SQL),
    )
    t.pg.whenRead(
      'nme',
      new SourceGatewayError('column "nme" does not exist', '42703'),
    )
    t.pg.whenRead(
      '1/0',
      new SourceGatewayError('division by zero perto de 42', '22012'),
    )
    t.pg.whenRead('FROM public.pedidos', [{ cliente: 'Ana', total: 3 }])

    const events = await t.generate()

    // Erro de sintaxe ou semântico segue com a mensagem; de execução, só com o código.
    expect(text(t.chatModels.calls[1] ?? [])).toContain(
      'column "nme" does not exist',
    )
    const third = text(t.chatModels.calls[2] ?? [])
    expect(third).toContain('Erro de execução no PostgreSQL: 22012')
    expect(third).not.toContain('division by zero')
    expect(events.at(-1)).toMatchObject({ type: 'done', attempts: 3 })

    // Banco fora do ar para sem pedir correção.
    t.events.length = 0
    t.chatModels.script(reply(VALID_SQL))
    t.pg.whenRead(
      'FROM public.pedidos',
      new SourceGatewayError('connect ECONNREFUSED', 'ECONNREFUSED'),
    )
    const stopped = await t.generate()
    expect(stopped.at(-1)).toEqual({
      type: 'stopped',
      message: 'Não foi possível conectar ao banco Sortify',
    })
    expect(t.chatModels.calls).toHaveLength(4)
  })
})
