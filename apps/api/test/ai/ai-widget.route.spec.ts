import type { IncomingMessage } from 'node:http'
import type { AiWidgetEvent } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connectionSchemas } from '../../src/database/schema'
import { createConnection, createDashboard } from '../factories'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const WIDGET_ID = '00000000-0000-4000-8000-000000000001'
const CYPHER =
  'MATCH (p:Pedido) RETURN p.categoria AS categoria, count(p) AS total'

const validReply = () =>
  JSON.stringify({
    cypher: CYPHER,
    visualization: 'BAR',
    mapping: {
      x: 'categoria',
      series: ['total'],
      stacked: false,
      horizontal: false,
    },
    title: 'Pedidos por categoria',
  })

const requestBody = (prompt = 'total de pedidos por categoria') => ({
  prompt,
  widgetId: WIDGET_ID,
  widget: { title: 'Widget', cypher: null, visualization: 'TABLE', config: {} },
})

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

const events = (res: { body: unknown }): AiWidgetEvent[] =>
  String(res.body)
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AiWidgetEvent)

async function setup(options: { configured?: boolean } = {}) {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  await test.db.insert(connectionSchemas).values({
    connectionId: connection.id,
    readAt: new Date(),
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
  const post = (agent: typeof admin.agent, body: unknown = requestBody()) =>
    agent
      .post(`/api/dashboards/${dashboard.id}/ai/widget`)
      .buffer(true)
      .parse(asText as never)
      .send(body as object)
  return { ...test, chatModels, admin, owner, dashboard, post }
}

describe('POST /api/dashboards/:id/ai/widget', () => {
  it('AIQ-12 resposta informa cada tentativa', async () => {
    const t = await setup()
    t.chatModels.script('sem cypher', validReply())

    const res = await t.post(t.owner.agent)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/x-ndjson')
    const lines = events(res)
    expect(lines.map((e) => e.type)).toEqual(['attempt', 'attempt', 'done'])
    expect(lines[0]).toEqual({ type: 'attempt', attempt: 1, maxAttempts: 4 })
    expect(lines[1]).toEqual({ type: 'attempt', attempt: 2, maxAttempts: 4 })
    expect(lines[2]).toMatchObject({ type: 'done', attempts: 2 })
  })

  it('AIQ-15 pedido longo responde 400', async () => {
    const t = await setup()

    const res = await t.post(t.owner.agent, requestBody('a'.repeat(4001)))

    expect(res.status).toBe(400)
    expect(JSON.parse(String(res.body)).fieldErrors.prompt).toBe(
      'O pedido passa de 4.000 caracteres',
    )
    expect(t.chatModels.calls).toHaveLength(0)
  })

  it('AIQ-16 sem provedor a geração responde 409', async () => {
    const t = await setup({ configured: false })

    const res = await t.owner.agent
      .post(`/api/dashboards/${t.dashboard.id}/ai/widget`)
      .send(requestBody())

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('LLM_NOT_CONFIGURED')
    expect(res.body.message).toBe('Nenhum provedor de IA configurado')
  })

  it('AIQ-18 Visualizador e quem não edita recebem 403 na geração', async () => {
    const t = await setup()
    t.chatModels.script(validReply(), validReply())
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viewer@x.com')
    const reader = await signInAs(t.app, t.db, 'EDITOR', 'leitor@x.com')
    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'fora@x.com')
    t.shares.grant(viewer.user.id, t.dashboard.id, 'edit')
    t.shares.grant(reader.user.id, t.dashboard.id, 'view')
    const url = `/api/dashboards/${t.dashboard.id}/ai/widget`

    expect((await viewer.agent.post(url).send(requestBody())).status).toBe(403)
    expect((await reader.agent.post(url).send(requestBody())).status).toBe(403)
    expect((await stranger.agent.post(url).send(requestBody())).status).toBe(
      404,
    )
    expect((await t.post(t.owner.agent)).status).toBe(200)
    expect((await t.post(t.admin.agent)).status).toBe(200)
  })

  it('AIQ-09 o corpo de done traz result.rows', async () => {
    const t = await setup()
    t.chatModels.script(validReply())

    const res = await t.post(t.owner.agent)

    const done = events(res).at(-1)
    expect(done).toMatchObject({
      type: 'done',
      result: {
        columns: ['categoria', 'total'],
        rows: [
          ['A', 3],
          ['B', 5],
        ],
      },
    })
  })
})
