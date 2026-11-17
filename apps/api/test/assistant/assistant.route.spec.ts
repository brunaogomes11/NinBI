import type { IncomingMessage } from 'node:http'
import {
  type AssistantEvent,
  type DashboardDto,
  MESSAGES,
  type SidebarDto,
} from '@ninbi/contracts'
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
const CYPHER =
  'MATCH (p:Pedido) RETURN p.categoria AS categoria, count(p) AS total'

const widgetReply = (cypher = CYPHER) =>
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

const plan = (actions: unknown[], reply = 'Pronto.') =>
  JSON.stringify({ reply, actions })

/** Lê o corpo inteiro como texto, qualquer que seja o tipo da resposta. */
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

const schemaDocument = {
  labels: [
    {
      name: 'Pedido',
      properties: [{ name: 'categoria', types: ['String'], example: null }],
    },
  ],
  relationshipTypes: [],
}

async function setup(options: { configured?: boolean; schema?: boolean } = {}) {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  if (options.schema !== false) {
    await test.db.insert(connectionSchemas).values({
      connectionId: connection.id,
      readAt: new Date(),
      document: schemaDocument,
    })
  }
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  if (options.configured !== false) {
    await admin.agent
      .put('/api/llm-config')
      .send({ provider: 'OPENAI', model: 'gpt-4o', apiKey: 'sk-teste-1234' })
      .expect(200)
  }
  test.neo4j.whenRead('MATCH (p:Pedido)', [
    { categoria: 'A', total: 3 },
    { categoria: 'B', total: 5 },
  ])
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const dashboard = await createDashboard(test.db, {
    ownerId: owner.user.id,
    connectionId: connection.id,
  })
  const draft = (extra: Record<string, unknown> = {}) => ({
    name: 'Painel',
    connectionId: connection.id,
    tabs: [{ id: uuid(10), name: 'Vendas', widgets: [] }],
    filters: [],
    ...extra,
  })
  const url = (id = dashboard.id) => `/api/dashboards/${id}/assistant/messages`
  const body = (
    message = 'faça algo',
    extra: Record<string, unknown> = {},
  ) => ({
    message,
    draft: draft(),
    ...extra,
  })
  const post = (
    agent: typeof admin.agent,
    payload: unknown = body(),
    id = dashboard.id,
  ) =>
    agent
      .post(url(id))
      .buffer(true)
      .parse(asText as never)
      .send(payload as object)
  const rows = (id = dashboard.id) =>
    test.db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.dashboardId, id))
      .orderBy(asc(assistantMessages.seq))
  return {
    ...test,
    chatModels,
    connection,
    admin,
    owner,
    dashboard,
    draft,
    body,
    post,
    rows,
  }
}

describe('POST /api/dashboards/:id/assistant/messages', () => {
  it('GEN-08 resposta informa o widget N de M em geração', async () => {
    const t = await setup()
    t.chatModels.script(
      plan([
        { type: 'create_tab', ref: 'nova', name: 'Lojas' },
        { type: 'create_widget', tab: 'nova', title: 'Um', prompt: 'um' },
        { type: 'create_widget', tab: 'nova', title: 'Dois', prompt: 'dois' },
      ]),
      widgetReply('MATCH (n) DELETE n'),
      widgetReply(),
      widgetReply(),
    )

    const res = await t.post(t.owner.agent)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/x-ndjson')
    const lines = events(res)
    expect(lines.map((e) => e.type)).toEqual([
      'accepted',
      'planned',
      'widget',
      'widget',
      'widget',
      'done',
    ])
    expect(lines[1]).toEqual({ type: 'planned', widgetsTotal: 2 })
    expect(lines.slice(2, 5)).toEqual([
      { type: 'widget', index: 1, total: 2, attempt: 1 },
      { type: 'widget', index: 1, total: 2, attempt: 2 },
      { type: 'widget', index: 2, total: 2, attempt: 1 },
    ])
  })

  it('CHAT-16 mensagem longa responde 400 com A mensagem passa de 4.000 caracteres', async () => {
    const t = await setup()

    const res = await t.owner.agent
      .post(`/api/dashboards/${t.dashboard.id}/assistant/messages`)
      .send(t.body('a'.repeat(4001)))

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(res.body.fieldErrors.message).toBe(
      'A mensagem passa de 4.000 caracteres',
    )
    expect(t.chatModels.calls).toHaveLength(0)
    expect(await t.rows()).toEqual([])
  })

  it('CHAT-17 Visualizador e quem não edita recebem 403 no assistente', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viz@x.com')
    const reader = await signInAs(t.app, t.db, 'EDITOR', 'leitor@x.com')
    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'fora@x.com')
    t.shares.grant(viewer.user.id, t.dashboard.id, 'edit')
    t.shares.grant(reader.user.id, t.dashboard.id, 'view')

    for (const who of [viewer, reader]) {
      expect((await t.post(who.agent)).status).toBe(403)
    }
    expect((await t.post(stranger.agent)).status).toBe(404)
    expect(t.chatModels.calls).toHaveLength(0)

    t.chatModels.script('Olá.', 'Olá de novo.')
    expect((await t.post(t.owner.agent)).status).toBe(200)
    expect((await t.post(t.admin.agent)).status).toBe(200)
  })

  it('CHAT-27 conexão sem schema lido responde 409 com Leia o schema da conexão antes de usar a IA', async () => {
    const t = await setup({ schema: false })

    const res = await t.owner.agent
      .post(`/api/dashboards/${t.dashboard.id}/assistant/messages`)
      .send(t.body())

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('SCHEMA_NOT_READ')
    expect(res.body.message).toBe('Leia o schema da conexão antes de usar a IA')
    expect(await t.rows()).toEqual([])
  })

  it('CHAT-21 Tentar novamente reaproveita a mensagem sem gravar outra', async () => {
    const t = await setup()
    t.chatModels.script(
      Object.assign(new Error('429'), { status: 429 }),
      'Feito.',
    )

    const first = events(await t.post(t.owner.agent, t.body('olá')))
    expect(first.map((e) => e.type)).toEqual(['accepted', 'provider_error'])
    const accepted = first[0]
    if (accepted?.type !== 'accepted') throw new Error('sem accepted')

    const second = events(
      await t.post(
        t.owner.agent,
        t.body('olá', { retryOf: accepted.userMessage.id }),
      ),
    )
    const stored = await t.rows()
    expect(stored.map((r) => r.role)).toEqual(['USER', 'ASSISTANT'])
    expect(second[0]).toMatchObject({
      type: 'accepted',
      userMessage: { id: accepted.userMessage.id },
    })
    expect(second.at(-1)?.type).toBe('done')

    // mensagem antiga (já respondida): grava uma nova
    t.chatModels.script('Outra.')
    await t.post(
      t.owner.agent,
      t.body('olá', { retryOf: accepted.userMessage.id }),
    )
    expect((await t.rows()).map((r) => r.role)).toEqual([
      'USER',
      'ASSISTANT',
      'USER',
      'ASSISTANT',
    ])
  })

  it('GEN-02 dashboard criado por quem pede a geração é dele e entra no fim da sidebar', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'novo@x.com')
    await editor.agent
      .post('/api/dashboards')
      .send({ name: 'Antigo', connectionId: t.connection.id })
      .expect(201)
    const created = await editor.agent
      .post('/api/dashboards')
      .send({ name: 'Gerado', connectionId: t.connection.id })
    expect(created.status).toBe(201)
    const id = (created.body as { id: string }).id

    const opened = (await editor.agent.get(`/api/dashboards/${id}`).expect(200))
      .body as DashboardDto
    expect(opened.ownerId).toBe(editor.user.id)
    const sidebar = (await editor.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto
    expect(sidebar.items.at(-1)).toMatchObject({ type: 'dashboard', id })

    t.chatModels.script(plan([], 'Descreva mais.'))
    const res = await t.post(
      editor.agent,
      {
        message: 'quero um painel de vendas',
        draft: {
          name: opened.name,
          connectionId: opened.connectionId,
          tabs: opened.tabs,
          filters: opened.filters,
        },
      },
      id,
    )
    expect(res.status).toBe(200)
    expect(events(res).at(-1)?.type).toBe('done')
  })

  it('sem provedor responde 409 LLM_NOT_CONFIGURED com Nenhum provedor de IA configurado', async () => {
    const t = await setup({ configured: false })

    const res = await t.owner.agent
      .post(`/api/dashboards/${t.dashboard.id}/assistant/messages`)
      .send(t.body())

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('LLM_NOT_CONFIGURED')
    expect(res.body.message).toBe(MESSAGES.llmNotConfigured)
    expect(await t.rows()).toEqual([])
  })
})
