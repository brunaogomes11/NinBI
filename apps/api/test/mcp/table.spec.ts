import type { McpCall } from '@ninbi/contracts'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { McpClientService } from '../../src/mcp/mcp-client.service'
import { McpTableService } from '../../src/mcp/mcp-table.service'
import { startMcpFixture } from './server-fixture'

const rows = {
  type: 'array',
  items: { $ref: '#/$defs/Row' },
}
const tool = {
  name: 'tickets',
  inputSchema: {
    type: 'object',
    properties: { state: { type: 'string' } },
    required: ['state'],
  },
  outputSchema: {
    type: 'object',
    $defs: {
      Row: {
        type: 'object',
        properties: {
          equipe: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          abertos: { type: 'integer' },
        },
        required: ['equipe', 'abertos'],
      },
    },
    properties: { tickets: rows, teams: rows },
    required: ['tickets', 'teams'],
  },
}
const call: McpCall = {
  connectionId: 'test',
  tool: 'tickets',
  listPath: ['tickets'],
  arguments: { state: 'open' },
  filterBindings: {},
}
const example = { equipe: 'Suporte', abertos: 8 }
let requests = 0
let tickets: unknown[] = []
let fixture: Awaited<ReturnType<typeof startMcpFixture>>

beforeAll(async () => {
  fixture = await startMcpFixture((method) => {
    if (method === 'tools/list') return { tools: [tool] }
    requests++
    return {
      content: [],
      structuredContent: { tickets, teams: [{ equipe: 'Outro', abertos: 0 }] },
    }
  })
})
afterAll(() => fixture.close())

function service(enabledTools = ['tickets']) {
  return new McpTableService(new McpClientService(5000), {
    get: async (id) => ({
      id,
      name: 'Teste',
      endpoint: fixture.endpoint,
      enabledTools,
    }),
  })
}

it('MCP-05 chamada retorna linhas e tipos das colunas', async () => {
  tickets = [example]
  await expect(service().execute(call, call.arguments)).resolves.toMatchObject({
    columns: ['equipe', 'abertos'],
    columnTypes: ['string', 'integer'],
    rows: [['Suporte', 8]],
    truncated: false,
  })
})

it('MCP-06 argumentos inválidos são recusados antes da chamada', async () => {
  const before = requests
  await expect(service().execute(call, { state: 9 })).rejects.toMatchObject({
    code: 'VALIDATION_ERROR',
  })
  expect(requests).toBe(before)
})

it('MCP-07 ferramenta desabilitada não é chamada', async () => {
  const before = requests
  await expect(service([]).execute(call, call.arguments)).rejects.toMatchObject(
    { status: 403 },
  )
  expect(requests).toBe(before)
})

it('MCP-08 resposta incompatível é recusada', async () => {
  tickets = [{ ...example, abertos: 'oito' }]
  await expect(service().execute(call, call.arguments)).rejects.toMatchObject({
    code: 'MCP_RESULT_INVALID',
  })
})

it('MCP-09 lista vazia preserva suas colunas tipadas', async () => {
  tickets = []
  await expect(service().execute(call, call.arguments)).resolves.toMatchObject({
    columns: ['equipe', 'abertos'],
    columnTypes: ['string', 'integer'],
    rows: [],
    truncated: false,
  })
})

it('MCP-11 resposta acima do limite é sinalizada como parcial', async () => {
  tickets = Array.from({ length: 5001 }, () => example)
  const result = await service().execute(call, call.arguments)
  expect(result).toMatchObject({ rowLimit: 5000, truncated: true })
  expect(result.rows).toHaveLength(5000)
})

it('MCP-23 somente a lista selecionada abastece o resultado', async () => {
  tickets = [example]
  await expect(
    service().execute({ ...call, listPath: ['teams'] }, call.arguments),
  ).resolves.toMatchObject({ rows: [['Outro', 0]] })
})
