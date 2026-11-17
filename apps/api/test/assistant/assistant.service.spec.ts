import { Logger } from '@nestjs/common'
import {
  type AssistantEvent,
  assistantRequestSchema,
  type DashboardFilter,
} from '@ninbi/contracts'
import { asc, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type AssistantBody,
  AssistantService,
} from '../../src/assistant/assistant.service'
import { AssistantHistoryService } from '../../src/assistant/assistant-history.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import {
  assistantMessages,
  connectionSchemas,
  dashboards,
  dashboardTabs,
  widgets,
} from '../../src/database/schema'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import { createConnection, createDashboard } from '../factories'
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

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`
const TAB_ID = uuid(10)
const WIDGET_ID = uuid(20)
const FILTER_ID = uuid(30)
const CURRENT_CYPHER = 'MATCH (n) RETURN count(n) AS total'
const VALID_CYPHER =
  'MATCH (p:Pedido) RETURN p.categoria AS categoria, count(p) AS total'

const widgetReply = (cypher = VALID_CYPHER, title = 'Pedidos por categoria') =>
  JSON.stringify({
    cypher,
    visualization: 'BAR',
    mapping: {
      x: 'categoria',
      series: ['total'],
      stacked: false,
      horizontal: false,
    },
    title,
  })

const plan = (actions: unknown[], reply = 'Pronto.') =>
  JSON.stringify({ reply, actions })

const createWidget = (title: string, tab = 'nova') => ({
  type: 'create_widget',
  tab,
  title,
  prompt: `mostre ${title}`,
})

const rateLimit = () => Object.assign(new Error('429'), { status: 429 })

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
  const dashboard = await createDashboard(test.db, {
    ownerId: admin.user.id,
    connectionId: connection.id,
  })
  test.neo4j.whenRead('MATCH (p:Pedido)', [
    { categoria: 'VALOR-DE-LINHA-5b2e', total: 1 },
  ])
  test.neo4j.whenRead('count(n)', [{ total: 7 }])

  const service = test.app.get(AssistantService)
  const draft = (extra: Record<string, unknown> = {}) => ({
    name: 'Painel',
    connectionId: connection.id,
    tabs: [
      {
        id: TAB_ID,
        name: 'Vendas',
        widgets: [
          {
            id: WIDGET_ID,
            title: 'Total por mês',
            cypher: CURRENT_CYPHER,
            visualization: 'TABLE',
            mapping: null,
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ],
      },
    ],
    filters: [] as unknown[],
    ...extra,
  })
  const body = (message = 'faça algo', extra: Record<string, unknown> = {}) =>
    assistantRequestSchema.parse({
      message,
      draft: draft(),
      ...extra,
    }) as AssistantBody
  const run = async (
    b: AssistantBody = body(),
    signal = new AbortController().signal,
    events: AssistantEvent[] = [],
  ) => {
    const prepared = await service.prepare({
      userId: admin.user.id,
      role: admin.user.role,
      dashboardId: dashboard.id,
      dashboardConnectionId: connection.id,
      body: b,
    })
    await service.run(prepared, (e) => events.push(e), signal)
    return events
  }
  const rows = () =>
    test.db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.dashboardId, dashboard.id))
      .orderBy(asc(assistantMessages.seq))
  const result = {
    ...test,
    chatModels,
    admin,
    connection,
    dashboard,
    service,
    draft,
    body,
    run,
    rows,
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

const sentText = (calls: { content: unknown }[][]) =>
  calls.flatMap((messages) => messages.map((m) => String(m.content))).join('\n')

const done = (events: AssistantEvent[]) => {
  const event = events.find((e) => e.type === 'done')
  if (event?.type !== 'done') throw new Error('sem evento done')
  return event
}

const reads = (t: {
  neo4j: { calls: { method: string; cypher?: string }[] }
}) => t.neo4j.calls.filter((c) => c.method === 'read')

describe('AssistantService', () => {
  it('GEN-03 geração cria abas, widgets e filtros devolvidos pelo LLM', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Total por mês'),
        createWidget('Ranking de lojas'),
        createWidget('Vendas por categoria'),
        {
          type: 'create_filter',
          label: 'Categoria',
          parameter: 'categoria',
          filterType: 'SINGLE_SELECT',
          options: { source: 'STATIC', values: ['A', 'B'] },
        },
      ]),
      widgetReply(),
      widgetReply(),
      widgetReply(),
    )

    const events = await t.run()

    expect(events.map((e) => e.type)).toEqual([
      'accepted',
      'planned',
      'widget',
      'widget',
      'widget',
      'done',
    ])
    expect(events[1]).toEqual({ type: 'planned', widgetsTotal: 3 })
    const { actions } = done(events)
    expect(actions.map((a) => a.type)).toEqual([
      'create_tab',
      'create_widget',
      'create_widget',
      'create_widget',
      'create_filter',
    ])
    const created = actions.filter((a) => a.type === 'create_widget')
    for (const action of created) {
      expect(action).toMatchObject({
        cypher: VALID_CYPHER,
        visualization: 'BAR',
        title: 'Pedidos por categoria',
        error: null,
      })
      expect(action.result?.rows).toHaveLength(1)
      expect(action.mapping).toMatchObject({ x: 'categoria' })
    }
    expect(actions[0]).toMatchObject({ tabId: created[0]?.tabId })
  })

  it('GEN-05 cada widget gerado passa pela validação, execução e autocorreção', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Um'),
        createWidget('Dois'),
      ]),
      widgetReply(),
      widgetReply('MATCH (n) DELETE n'),
      widgetReply(VALID_CYPHER, 'Dois corrigido'),
    )

    const events = await t.run()

    const executed = reads(t).map((c) => c.cypher)
    expect(executed).toEqual([VALID_CYPHER, VALID_CYPHER])
    const widgetsDone = done(events).actions.filter(
      (a) => a.type === 'create_widget',
    )
    expect(widgetsDone[1]).toMatchObject({
      cypher: VALID_CYPHER,
      title: 'Dois corrigido',
      error: null,
    })
    expect(events.filter((e) => e.type === 'widget')).toEqual([
      { type: 'widget', index: 1, total: 2, attempt: 1 },
      { type: 'widget', index: 2, total: 2, attempt: 1 },
      { type: 'widget', index: 2, total: 2, attempt: 2 },
    ])
  })

  it('GEN-06 widget que continua falhando entra com erro e o último Cypher e os demais seguem', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Um'),
        createWidget('Dois'),
        createWidget('Três'),
      ]),
      widgetReply(),
      widgetReply('MATCH (n) DELETE n'),
      widgetReply('MATCH (n) SET n.a = 1'),
      widgetReply('MATCH (n) REMOVE n.a'),
      widgetReply('MATCH (n) DETACH DELETE n'),
      widgetReply(),
    )

    const events = await t.run()

    const created = done(events).actions.filter(
      (a) => a.type === 'create_widget',
    )
    expect(created[1]).toMatchObject({
      cypher: 'MATCH (n) DETACH DELETE n',
      visualization: 'TABLE',
      mapping: null,
      result: null,
    })
    expect(created[1]?.error).toEqual(expect.any(String))
    expect(created[2]).toMatchObject({ visualization: 'BAR', error: null })

    // Neo4j fora do ar também vira widget com erro, e o laço não repete.
    events.length = 0
    t.neo4j.whenRead(
      'MATCH (p:Pedido)',
      new Neo4jGatewayError('sem rota', 'ServiceUnavailable'),
    )
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Outra' },
        createWidget('Quatro'),
      ]),
      widgetReply(),
    )
    await t.run(t.body('de novo'), undefined, events)
    const unavailable = done(events).actions.filter(
      (a) => a.type === 'create_widget',
    )
    expect(unavailable[0]).toMatchObject({
      visualization: 'TABLE',
      result: null,
    })
    expect(unavailable[0]?.error).toEqual(expect.any(String))
  })

  it('GEN-07 resposta da geração informa quantos widgets foram criados e os títulos com erro', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Total por mês'),
        createWidget('Ranking de lojas'),
        createWidget('Vendas por categoria'),
      ]),
      widgetReply(),
      widgetReply('MATCH (n) DELETE n'),
      widgetReply('MATCH (n) SET n.a = 1'),
      widgetReply('MATCH (n) REMOVE n.a'),
      widgetReply('MATCH (n) DETACH DELETE n'),
      widgetReply(),
    )

    const events = await t.run()

    expect(done(events).reply.details).toMatchObject({
      createdWidgets: 3,
      failedWidgets: ['Ranking de lojas'],
      discardedWidgets: 0,
    })
  })

  it('GEN-09 cancelar para a geração sem nova chamada nem resposta gravada', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Um'),
        createWidget('Dois'),
      ]),
      widgetReply(),
      'hang',
      widgetReply(),
    )
    const abort = new AbortController()
    const events: AssistantEvent[] = []
    const running = t.run(t.body(), abort.signal, events)
    await waitFor(() => t.chatModels.calls.length === 3)

    abort.abort()
    await running
    const seen = events.length

    expect(events.map((e) => e.type)).not.toContain('done')
    expect(events).toHaveLength(seen)
    expect(t.chatModels.calls).toHaveLength(3)
    const stored = await t.rows()
    expect(stored.map((r) => r.role)).toEqual(['USER'])
  })

  it('GEN-13 pedido ao assistente não grava o dashboard', async () => {
    const t = await setup()
    const snapshot = async () => ({
      dashboard: await t.db.select().from(dashboards),
      tabs: await t.db.select().from(dashboardTabs),
      widgets: await t.db.select().from(widgets),
    })
    const before = await snapshot()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Um'),
        { type: 'rename_dashboard', name: 'Novo nome' },
      ]),
      widgetReply(),
    )

    await t.run()

    expect(await snapshot()).toEqual(before)
  })

  it('CHAT-05 assistente envia ao LLM só as 20 mensagens mais recentes', async () => {
    const t = await setup()
    const history = t.app.get(AssistantHistoryService)
    for (let i = 1; i <= 25; i++) {
      const label = `MSG-${String(i).padStart(2, '0')}`
      if (i % 2 === 1) {
        await history.appendUser(t.admin.user.id, t.dashboard.id, label)
      } else {
        await history.appendAssistant(t.admin.user.id, t.dashboard.id, label, {
          changes: [],
          notApplied: [],
          createdWidgets: 0,
          failedWidgets: [],
          discardedWidgets: 0,
        })
      }
    }
    t.chatModels.script(plan([]))

    await t.run(t.body('NOVA-MENSAGEM'))

    const messages = t.chatModels.calls[0] ?? []
    const contents = messages.map((m) => String(m.content))
    // sistema + 20 da conversa + a mensagem nova com o rascunho
    expect(messages).toHaveLength(22)
    expect(contents[1]).toContain('MSG-06')
    expect(contents.join('\n')).not.toContain('MSG-05')
    expect(contents[20]).toContain('MSG-25')
    expect(contents[21]).toContain('NOVA-MENSAGEM')
  })

  it('CHAT-06 nenhuma linha de resultado nem valor de filtro chega ao provedor', async () => {
    const t = await setup()
    const filter: DashboardFilter = {
      id: FILTER_ID,
      label: 'Categoria',
      parameter: 'categoria',
      type: 'SINGLE_SELECT',
      options: { source: 'STATIC', values: ['OPCAO-77aa'] },
      defaultValue: 'VALOR-DE-FILTRO-c41d',
    }
    const withFilter = (message: string) =>
      assistantRequestSchema.parse({
        message,
        draft: {
          ...t.draft({ filters: [filter] }),
          tabs: [
            {
              id: TAB_ID,
              name: 'Vendas',
              widgets: [
                {
                  id: WIDGET_ID,
                  title: 'Total por mês',
                  cypher: CURRENT_CYPHER,
                  visualization: 'TABLE',
                  mapping: null,
                  layout: { x: 0, y: 0, w: 4, h: 4 },
                  result: { rows: [['VALOR-DE-LINHA-5b2e']] },
                },
              ],
            },
          ],
        },
      }) as AssistantBody
    t.chatModels.script(
      plan([createWidget('Um', 't1')]),
      widgetReply(),
      plan([]),
    )

    await t.run(withFilter('primeiro'))
    await t.run(withFilter('segundo'))

    const sent = sentText(t.chatModels.calls)
    expect(t.chatModels.calls.length).toBeGreaterThanOrEqual(3)
    expect(sent).not.toContain('VALOR-DE-LINHA-5b2e')
    expect(sent).not.toContain('VALOR-DE-FILTRO-c41d')
    expect(sent).not.toContain('OPCAO-77aa')
    expect(sent).toContain('$categoria')
  })

  it('CHAT-08 ação que muda o Cypher passa pela validação, execução e autocorreção', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'update_widget', widget: 'w1', prompt: 'agrupe por categoria' },
      ]),
      widgetReply('MATCH (n) DELETE n'),
      widgetReply(VALID_CYPHER, 'Por categoria'),
    )

    const events = await t.run()

    const generation = sentText([t.chatModels.calls[1] ?? []])
    expect(generation).toContain('Total por mês')
    expect(generation).toContain(CURRENT_CYPHER)
    expect(reads(t).map((c) => c.cypher)).toEqual([VALID_CYPHER])
    expect(done(events).actions[0]).toMatchObject({
      type: 'update_widget',
      widgetId: WIDGET_ID,
      cypher: VALID_CYPHER,
      visualization: 'BAR',
      title: 'Por categoria',
      error: null,
    })

    // só a visualização: nenhuma chamada ao modelo de widget, resultado do Cypher atual
    events.length = 0
    const calls = t.chatModels.calls.length
    t.chatModels.script(
      plan([{ type: 'update_widget', widget: 'w1', visualization: 'BAR' }]),
    )
    await t.run(t.body('mude para barras'), undefined, events)
    expect(t.chatModels.calls).toHaveLength(calls + 1)
    const action = done(events).actions[0]
    expect(action).toMatchObject({
      type: 'update_widget',
      widgetId: WIDGET_ID,
      visualization: 'BAR',
      error: null,
    })
    expect(action).toMatchObject({ result: { rows: [[7]] } })
    expect(reads(t).at(-1)?.cypher).toBe(CURRENT_CYPHER)
  })

  it('CHAT-09 resposta do assistente traz a lista do que mudou', async () => {
    const t = await setup()
    t.chatModels.script(
      plan(
        [
          { type: 'rename_dashboard', name: 'Vendas 2026' },
          { type: 'remove_widget', widget: 'w1' },
          { type: 'remove_widget', widget: 'w9' },
        ],
        'Renomeei e removi.',
      ),
    )

    const events = await t.run()

    const { reply } = done(events)
    expect(reply.text).toBe('Renomeei e removi.')
    expect(reply.details?.changes).toEqual([
      'Dashboard renomeado: Vendas 2026',
      'Widget removido: Total por mês',
    ])
    expect(reply.details?.notApplied).toEqual(['Não aplicado: w9 não existe'])
  })

  it('CHAT-12 resposta sem ações não altera o rascunho', async () => {
    const t = await setup()
    t.chatModels.script('Este dashboard mostra vendas.')

    const events = await t.run()

    expect(events.map((e) => e.type)).toEqual(['accepted', 'planned', 'done'])
    const event = done(events)
    expect(event.actions).toEqual([])
    expect(event.reply.text).toBe('Este dashboard mostra vendas.')
    const stored = await t.rows()
    expect(stored.at(-1)).toMatchObject({
      role: 'ASSISTANT',
      text: 'Este dashboard mostra vendas.',
    })
  })

  it('CHAT-22 falha do provedor no meio dos widgets não devolve ações nem grava resposta', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Um'),
        createWidget('Dois'),
      ]),
      widgetReply(),
      rateLimit(),
    )

    const events = await t.run()

    const last = events.at(-1)
    expect(last).toMatchObject({
      type: 'provider_error',
      code: 'AI_PROVIDER_RATE_LIMIT',
    })
    expect(events.map((e) => e.type)).not.toContain('done')
    const stored = await t.rows()
    expect(stored.map((r) => r.role)).toEqual(['USER'])
  })

  it('CHAT-29 log de cada pedido tem usuário, dashboard, ações, widgets com erro e duração sem o texto', async () => {
    const t = await setup()
    const logged: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      logged.push(String(message))
    })
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        createWidget('Um'),
      ]),
      widgetReply('MATCH (n) DELETE n'),
      widgetReply('MATCH (n) SET n.a = 1'),
      widgetReply('MATCH (n) REMOVE n.a'),
      widgetReply('MATCH (n) DETACH DELETE n'),
      rateLimit(),
    )

    await t.run(t.body('TEXTO-SECRETO-9e1f'))
    await t.run(t.body('outro pedido'))

    const lines = logged.filter((line) => line.startsWith('assistant request'))
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(
      new RegExp(
        `^assistant request user=${t.admin.user.id} dashboard=${t.dashboard.id} actions=2 widgetErrors=1 durationMs=\\d+ result=ok$`,
      ),
    )
    expect(lines[1]).toMatch(/ result=provider_error$/)
    expect(lines[1]).toMatch(/durationMs=\d+/)
    for (const line of lines) {
      expect(line).not.toContain('TEXTO-SECRETO-9e1f')
      expect(line).not.toContain('MATCH')
    }
  })

  it('HIST-01 mensagem do usuário e resposta do assistente ficam gravadas no PostgreSQL', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([{ type: 'rename_dashboard', name: 'Novo' }], 'Renomeado.'),
    )

    await t.run(t.body('renomeie o dashboard'))

    const stored = await t.rows()
    expect(stored).toHaveLength(2)
    expect(stored[0]).toMatchObject({
      role: 'USER',
      text: 'renomeie o dashboard',
      details: null,
    })
    expect(stored[1]).toMatchObject({
      role: 'ASSISTANT',
      text: 'Renomeado.',
      details: { changes: ['Dashboard renomeado: Novo'], createdWidgets: 0 },
    })
  })
})
