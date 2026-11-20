import { randomUUID } from 'node:crypto'
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

function serverFixture(source: string) {
  const calls: unknown[] = []
  return startMcpFixture((method, params) => {
    if (method === 'tools/list')
      return {
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
              },
              required: ['records'],
            },
          },
        ],
      }
    calls.push(params)
    return {
      content: [],
      structuredContent: {
        records: [
          {
            source,
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
  let url: string
  let widgetA: string
  let widgetB: string

  beforeAll(async () => {
    app = await createTestApp()
    first = await serverFixture('A')
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
    const secondConnection = await register('B', second.endpoint)
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
              visualization: 'TABLE',
              config: {},
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
    await app?.close()
  })

  it('MCP-12 configuração da chamada é persistida no widget', async () => {
    const { body } = await owner.get(url).expect(200)
    expect(body.connectionId).toBeNull()
    expect(body.tabs[0].widgets[0]).toMatchObject({
      id: widgetA,
      mcpCall: { ...values, connectionId: firstConnection },
      parameters: ['team'],
    })
  })
})
