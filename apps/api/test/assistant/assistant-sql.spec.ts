import type { IncomingMessage } from 'node:http'
import type { AssistantEvent, ConnectionType } from '@ninbi/contracts'
import { asc, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { assistantMessages, connectionSchemas } from '../../src/database/schema'
import { createConnection, createDashboard } from '../factories'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`
const TAB_ID = uuid(10)

const VALID_SQL =
  'SELECT c.cidade AS cidade, count(*) AS total FROM public.pedidos p JOIN public.clientes c ON c.id = p.cliente_id GROUP BY c.cidade'
const VALID_CYPHER =
  'MATCH (p:Pedido) RETURN p.categoria AS cidade, count(p) AS total'
const SQL_OPTIONS = 'SELECT DISTINCT cidade AS value FROM public.clientes'
const CYPHER_OPTIONS = 'MATCH (c:Cliente) RETURN DISTINCT c.cidade AS value'
const CYPHER_WRITE =
  'MATCH (c:Cliente) SET c.visto = true RETURN DISTINCT c.cidade AS value'

const widgetReply = (query: string, title = 'Pedidos por cidade') =>
  JSON.stringify({
    cypher: query,
    visualization: 'BAR',
    mapping: {
      x: 'cidade',
      series: ['total'],
      stacked: false,
      horizontal: false,
    },
    title,
  })

const plan = (actions: unknown[], reply = 'Pronto.') =>
  JSON.stringify({ reply, actions })

const createWidget = (title: string) => ({
  type: 'create_widget',
  tab: 't1',
  title,
  prompt: `mostre ${title}`,
})

const queryFilter = (parameter: string, cypher: string) => ({
  type: 'create_filter',
  label: `Filtro ${parameter}`,
  parameter,
  filterType: 'SINGLE_SELECT',
  options: { source: 'QUERY', cypher },
})

const asText = (
  res: IncomingMessage,
  callback: (error: Error | null, body: string) => void,
) => {
  let data = ''
  res.setEncoding('utf8')
  res.on('data', (chunk: string) => {
    data += chunk
  })
  res.on('end', () => callback(null, data))
}

const events = (res: { body: unknown }): AssistantEvent[] =>
  String(res.body)
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AssistantEvent)

const done = (lines: AssistantEvent[]) => {
  const event = lines.find((e) => e.type === 'done')
  if (event?.type !== 'done') throw new Error('sem evento done')
  return event
}

const text = (messages: { content: unknown }[] | undefined) =>
  (messages ?? []).map((m) => String(m.content)).join('\n')

const graphDocument = {
  labels: [
    {
      name: 'Pedido',
      properties: [{ name: 'categoria', types: ['String'], example: null }],
    },
  ],
  relationshipTypes: [],
}

const relationalDocument = {
  kind: 'RELATIONAL',
  tables: [
    {
      name: 'public.pedidos',
      isView: false,
      columns: [
        { name: 'id', type: 'integer', example: '1' },
        { name: 'cliente_id', type: 'integer', example: '42' },
      ],
    },
    {
      name: 'public.clientes',
      isView: false,
      columns: [
        { name: 'id', type: 'integer', example: '42' },
        { name: 'cidade', type: 'varchar(80)', example: 'Recife' },
      ],
    },
  ],
  foreignKeys: [
    {
      from: { table: 'public.pedidos', columns: ['cliente_id'] },
      to: { table: 'public.clientes', columns: ['id'] },
    },
  ],
}

async function setup(
  options: { saved?: ConnectionType; sqlSchema?: boolean } = {},
) {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  close = test.close
  const crypto = test.app.get(CryptoService)
  const neo4j = await createConnection(test.db, crypto, { name: 'Grafo' })
  await test.db.insert(connectionSchemas).values({
    connectionId: neo4j.id,
    readAt: new Date('2026-01-01T12:00:00Z'),
    document: graphDocument,
  })
  const sql = {} as Record<
    Exclude<ConnectionType, 'NEO4J'>,
    Awaited<ReturnType<typeof createConnection>>
  >
  for (const type of ['POSTGRES', 'MYSQL', 'SQLSERVER'] as const) {
    sql[type] = await createConnection(test.db, crypto, {
      name: `Loja ${type}`,
      type,
    })
    if (options.sqlSchema !== false) {
      await test.db.insert(connectionSchemas).values({
        connectionId: sql[type].id,
        readAt: new Date('2026-01-01T12:00:00Z'),
        document: relationalDocument,
      })
    }
  }
  const byType = (type: ConnectionType) =>
    type === 'NEO4J' ? neo4j : sql[type]

  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  await admin.agent
    .put('/api/llm-config')
    .send({ provider: 'OPENAI', model: 'gpt-4o', apiKey: 'sk-teste-1234' })
    .expect(200)
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const dashboard = await createDashboard(test.db, {
    ownerId: owner.user.id,
    connectionId: byType(options.saved ?? 'POSTGRES').id,
  })
  const draft = (
    type: ConnectionType,
    widgets: unknown[] = [],
    extra: Record<string, unknown> = {},
  ) => ({
    name: 'Painel',
    connectionId: byType(type).id,
    tabs: [{ id: TAB_ID, name: 'Vendas', widgets }],
    filters: [],
    ...extra,
  })
  const post = (payload: unknown, dashboardId = dashboard.id) =>
    owner.agent
      .post(`/api/dashboards/${dashboardId}/assistant/messages`)
      .buffer(true)
      .parse(asText as never)
      .send(payload as object)
  const rows = () =>
    test.db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.dashboardId, dashboard.id))
      .orderBy(asc(assistantMessages.seq))
  const neo4jReads = () =>
    test.neo4j.calls.flatMap((c) =>
      c.method === 'read' ? [(c as { cypher?: string }).cypher] : [],
    )
  return {
    ...test,
    chatModels,
    owner,
    dashboard,
    byType,
    draft,
    post,
    rows,
    neo4jReads,
  }
}

describe('assistente em conexão SQL', () => {
  it('ASQ-05 criar widget em conexão SQL pede a consulta no dialeto', async () => {
    const t = await setup()
    const cases = [
      { type: 'POSTGRES', dialect: 'PostgreSQL', banco: 'PostgreSQL' },
      { type: 'MYSQL', dialect: 'MySQL', banco: 'MySQL' },
      { type: 'SQLSERVER', dialect: 'T-SQL', banco: 'SQL Server' },
    ] as const
    for (const item of cases) {
      const gateway = t.sql[item.type]
      gateway.whenRead('FROM public.pedidos', [
        { cidade: 'Recife', total: 3 },
        { cidade: 'Natal', total: 1 },
      ])
      const before = t.chatModels.calls.length
      t.chatModels.script(
        plan([createWidget('Pedidos por cidade')]),
        widgetReply(VALID_SQL),
      )

      const res = await t.post({
        message: 'pedidos por cidade',
        draft: t.draft(item.type),
      })

      expect(res.status).toBe(200)
      const [planCall, widgetCall] = t.chatModels.calls.slice(before)
      expect(text(planCall)).toContain(
        `Você é o assistente de um dashboard de dados em ${item.banco}:`,
      )
      const widgetPrompt = text(widgetCall)
      expect(widgetPrompt).toContain(
        `Você escreve consultas ${item.dialect} para widgets de dashboard em um banco ${item.banco}.`,
      )
      expect(widgetPrompt).toContain(
        'public.pedidos.cliente_id → public.clientes.id',
      )
      expect(widgetPrompt).not.toContain('Você escreve consultas Cypher')
      expect(gateway.reads).toEqual([VALID_SQL])
      const [created] = done(events(res)).actions
      expect(created).toMatchObject({
        type: 'create_widget',
        cypher: VALID_SQL,
        visualization: 'BAR',
        error: null,
        result: {
          columns: ['cidade', 'total'],
          rows: [
            ['Recife', 3],
            ['Natal', 1],
          ],
        },
      })
    }
    expect(t.neo4jReads()).toEqual([])
  })

  it('ASQ-09 conexão SQL sem schema lido responde 409', async () => {
    const t = await setup({ saved: 'POSTGRES', sqlSchema: false })

    for (const type of ['POSTGRES', 'MYSQL', 'SQLSERVER'] as const) {
      const res = await t.owner.agent
        .post(`/api/dashboards/${t.dashboard.id}/assistant/messages`)
        .send({ message: 'faça algo', draft: t.draft(type) })

      expect(res.status).toBe(409)
      expect(res.body.code).toBe('SCHEMA_NOT_READ')
      expect(res.body.message).toBe(
        'Leia o schema da conexão antes de usar a IA',
      )
    }
    expect(t.chatModels.calls).toHaveLength(0)
    expect(await t.rows()).toEqual([])
  })

  it('ASQ-10 o tipo da conexão do rascunho decide schema e dialeto', async () => {
    // Dashboard salvo em Neo4j, rascunho trocado para PostgreSQL sem salvar.
    const t = await setup({ saved: 'NEO4J' })
    t.sql.POSTGRES.whenRead('FROM public.pedidos', [
      { cidade: 'Recife', total: 3 },
    ])
    t.neo4j.whenRead('MATCH (p:Pedido)', [{ cidade: 'X', total: 1 }])
    t.chatModels.script(
      plan([
        createWidget('Pedidos por cidade'),
        queryFilter('cidade', SQL_OPTIONS),
        queryFilter('categoria', CYPHER_OPTIONS),
      ]),
      widgetReply(VALID_SQL),
    )

    const sqlRes = await t.post({
      message: 'pedidos por cidade',
      draft: t.draft('POSTGRES'),
    })

    expect(sqlRes.status).toBe(200)
    const [sqlPlan, sqlWidget] = t.chatModels.calls
    expect(text(sqlPlan)).toContain('dashboard de dados em PostgreSQL')
    expect(text(sqlPlan)).toContain('Tabelas')
    expect(text(sqlPlan)).toContain('public.clientes')
    expect(text(sqlPlan)).not.toContain('(:Pedido)')
    expect(text(sqlWidget)).toContain('Você escreve consultas PostgreSQL')
    expect(t.sql.POSTGRES.reads).toEqual([VALID_SQL])
    expect(t.neo4jReads()).toEqual([])
    const sqlActions = done(events(sqlRes)).actions
    // A consulta de opções vale pelo validador de SQL: a de Cypher é descartada.
    expect(sqlActions.map((a) => a.type)).toEqual([
      'create_widget',
      'create_filter',
    ])
    expect(sqlActions[1]).toMatchObject({
      filter: { options: { source: 'QUERY', cypher: SQL_OPTIONS } },
    })

    // O inverso: dashboard salvo em PostgreSQL, rascunho trocado para Neo4j.
    const savedSql = await createDashboard(t.db, {
      ownerId: t.owner.user.id,
      connectionId: t.byType('POSTGRES').id,
    })
    const calls = t.chatModels.calls.length
    t.chatModels.script(
      plan([
        createWidget('Pedidos por categoria'),
        queryFilter('cidade', CYPHER_WRITE),
        queryFilter('categoria', CYPHER_OPTIONS),
      ]),
      widgetReply(VALID_CYPHER),
    )

    const graphRes = await t.post(
      { message: 'pedidos por categoria', draft: t.draft('NEO4J') },
      savedSql.id,
    )

    expect(graphRes.status).toBe(200)
    const [graphPlan, graphWidget] = t.chatModels.calls.slice(calls)
    expect(text(graphPlan)).toContain('dashboard de dados em Neo4j')
    expect(text(graphPlan)).toContain('(:Pedido)')
    expect(text(graphPlan)).not.toContain('Tabelas')
    expect(text(graphWidget)).toContain('Você escreve consultas Cypher')
    expect(t.neo4jReads()).toEqual([VALID_CYPHER])
    expect(t.sql.POSTGRES.reads).toEqual([VALID_SQL])
    // A mesma consulta Cypher de opções recusada na conexão SQL entra pelo validador de Cypher.
    const graphActions = done(events(graphRes)).actions
    expect(graphActions.map((a) => a.type)).toEqual([
      'create_widget',
      'create_filter',
    ])
    expect(graphActions[1]).toMatchObject({
      filter: { options: { source: 'QUERY', cypher: CYPHER_OPTIONS } },
    })
  })
})
