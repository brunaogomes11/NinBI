import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'
import { startMcpFixture } from './server-fixture'

const filter = {
  id: randomUUID(),
  type: 'TEXT',
  parameter: 'team',
  label: 'Equipe',
  defaultValue: null,
  options: null,
}
const values = {
  tool: 'list',
  listPath: ['records'],
  arguments: { team: 'Todos' },
  filterBindings: { team: 'team' },
}

async function protectedOrigin() {
  const requests: (string | undefined)[] = []
  const authorization = 'Bearer origin-test-token'
  const server = createServer((req, res) => {
    requests.push(req.headers.authorization)
    if (req.headers.authorization !== authorization) {
      res.writeHead(401).end()
      return
    }
    res.end('A')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/protected`
  return {
    requests,
    authorization,
    read: async () => (await fetch(url, { headers: { authorization } })).text(),
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
        server.closeAllConnections()
      }),
  }
}

function serverFixture(source: string, readOrigin = async () => source) {
  const calls: unknown[] = []
  return startMcpFixture(async (method, params) => {
    if (method === 'tools/list') {
      if ((params as { cursor?: string } | undefined)?.cursor === 'metadata') {
        return {
          tools: [
            { name: `metadata_${source}`, inputSchema: { type: 'object' } },
          ],
        }
      }
      return {
        nextCursor: 'metadata',
        tools: [
          {
            name: 'list',
            annotations: { readOnlyHint: true },
            inputSchema: {
              type: 'object',
              properties: { team: { type: 'string' } },
              required: ['team'],
            },
            outputSchema: {
              type: 'object',
              properties: {
                records: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      team: { type: 'string' },
                    },
                    required: ['source', 'team'],
                  },
                },
                summary: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { total: { type: 'integer' } },
                  },
                },
                nested: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { detail: { type: 'object' } },
                  },
                },
              },
              required: ['records'],
            },
          },
        ],
      }
    }
    calls.push(params)
    return {
      content: [],
      structuredContent: {
        records: [
          {
            source: await readOrigin(),
            team: (params as { arguments: { team: string } }).arguments.team,
          },
        ],
      },
    }
  }).then((fixture) => ({ ...fixture, calls }))
}

describe('execução de dashboards MCP', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>
  let first: Awaited<ReturnType<typeof serverFixture>>
  let second: Awaited<ReturnType<typeof serverFixture>>
  let owner: Awaited<ReturnType<typeof signInAs>>['agent']
  let firstConnection: string
  let secondConnection: string
  let origin: Awaited<ReturnType<typeof protectedOrigin>>
  let url: string
  let widgetA: string
  let widgetB: string

  beforeAll(async () => {
    app = await createTestApp()
    origin = await protectedOrigin()
    first = await serverFixture('A', origin.read)
    second = await serverFixture('B')
    const { agent: admin } = await signInAs(
      app.app,
      app.db,
      'ADMIN',
      'mcp-admin@example.com',
    )
    async function register(name: string, endpoint: string) {
      const { body } = await admin
        .post('/api/mcp/connections')
        .send({ name, endpoint })
        .expect(201)
      await admin
        .patch(`/api/mcp/connections/${body.id}`)
        .send({ enabledTools: ['list'] })
        .expect(200)
      return body.id as string
    }
    firstConnection = await register('A', first.endpoint)
    secondConnection = await register('B', second.endpoint)
    ;({ agent: owner } = await signInAs(
      app.app,
      app.db,
      'EDITOR',
      'mcp-owner@example.com',
    ))
    const { body: created } = await owner
      .post('/api/dashboards')
      .send({ name: 'MCP', connectionId: null })
      .expect(201)
    url = `/api/dashboards/${created.id}`
    widgetA = randomUUID()
    widgetB = randomUUID()
    await owner
      .put(url)
      .send({
        version: created.version,
        name: 'MCP',
        connectionId: null,
        filters: [filter],
        tabs: [
          {
            id: created.tabs[0].id,
            name: 'Aba 1',
            widgets: [
              [widgetA, firstConnection],
              [widgetB, secondConnection],
            ].map(([id, connectionId], index) => ({
              id,
              title: `Fonte ${index}`,
              cypher: null,
              visualization: 'LIST',
              config: {
                mapping: { primary: 'team', secondary: null, values: [] },
              },
              layout: { x: index * 4, y: 0, w: 4, h: 4 },
              mcpCall: { connectionId, ...values },
            })),
          },
        ],
      })
      .expect(200)
  }, 120_000)

  afterAll(async () => {
    await first?.close()
    await second?.close()
    await origin?.close()
    await app?.close()
  })

  it('MCP-02 catálogo vem da conexão escolhida', async () => {
    const catalog = (id: string) =>
      owner.get(`/api/mcp/connections/${id}/tools`).expect(200)
    const [a, b] = await Promise.all([
      catalog(firstConnection),
      catalog(secondConnection),
    ])
    expect(a.body.map((item: { name: string }) => item.name)).toEqual([
      'list',
      'metadata_A',
    ])
    expect(b.body.map((item: { name: string }) => item.name)).toEqual([
      'list',
      'metadata_B',
    ])
    expect(a.body[0].lists).toEqual([
      {
        path: ['records'],
        columns: [
          { name: 'source', type: 'string' },
          { name: 'team', type: 'string' },
        ],
      },
      { path: ['summary'], columns: [{ name: 'total', type: 'integer' }] },
    ])
  })

  it('MCP-12 configuração da chamada é persistida no widget', async () => {
    const { body } = await owner.get(url).expect(200)
    expect(body.connectionId).toBeNull()
    expect(body.tabs[0].widgets[0]).toMatchObject({
      id: widgetA,
      visualization: 'LIST',
      config: { mapping: { primary: 'team', secondary: null, values: [] } },
      mcpCall: { ...values, connectionId: firstConnection },
      parameters: ['team'],
    })
  })

  it('MCP-21 widgets salvos executam em seus respectivos servidores', async () => {
    const { body: a } = await owner
      .post(`${url}/widgets/${widgetA}/run`)
      .send({ params: { team: 'Suporte' } })
      .expect(200)
    const { body: b } = await owner
      .post(`${url}/widgets/${widgetB}/run`)
      .send({})
      .expect(200)
    expect(a.rows).toEqual([['A', 'Suporte']])
    expect(b.rows).toEqual([['B', 'Todos']])
  })

  it('MCP-16 painel sem acesso não despacha chamada', async () => {
    const callsBefore = first.calls.length
    const { agent } = await signInAs(
      app.app,
      app.db,
      'VIEWER',
      'mcp-outsider@example.com',
    )
    await agent.post(`${url}/widgets/${widgetA}/run`).send({}).expect(404)
    expect(first.calls).toHaveLength(callsBefore)
  })

  it('MCP-17 rota salva executa MCP sem chamar o provedor de IA', async () => {
    const { body } = await owner
      .post(`${url}/widgets/${widgetA}/run`)
      .send({})
      .expect(200)
    expect(body.rows).toEqual([['A', 'Todos']])
    const { body: filtered } = await owner
      .post(`${url}/widgets/${widgetA}/run`)
      .send({ params: { team: 'Operações' } })
      .expect(200)
    expect(filtered.rows).toEqual([['A', 'Operações']])
    expect(app.chatModels.calls).toHaveLength(0)
  })

  it('MCP-20 prévia faz chamadas somente ao endpoint MCP cadastrado', async () => {
    const callsBefore = second.calls.length
    const firstCallsBefore = first.calls.length
    const originBefore = origin.requests.length
    const { body } = await owner
      .post(`${url}/mcp/preview`)
      .send({
        call: { ...values, connectionId: firstConnection },
        params: { team: 'Plataforma' },
      })
      .expect(200)
    expect(body.rows).toEqual([['A', 'Plataforma']])
    expect(first.calls.at(-1)).toMatchObject({
      name: 'list',
      arguments: { team: 'Plataforma' },
    })
    expect(second.calls).toHaveLength(callsBefore)
    expect(first.calls).toHaveLength(firstCallsBefore + 1)
    expect(origin.requests.slice(originBefore)).toEqual([origin.authorization])
  })
})
