import { expect, it } from 'vitest'
import { McpClientService } from '../../src/mcp/mcp-client.service'
import { startMcpFixture } from './server-fixture'

const tool = (name: string) => ({ name, inputSchema: { type: 'object' } })

it('transporte devolve o catálogo do endpoint solicitado', async () => {
  const first = await startMcpFixture(() => ({ tools: [tool('tickets')] }))
  const second = await startMcpFixture(() => ({ tools: [tool('projects')] }))
  try {
    const client = new McpClientService(3000)
    expect(
      (await client.listTools(first.endpoint)).map((item) => item.name),
    ).toEqual(['tickets'])
    expect(
      (await client.listTools(second.endpoint)).map((item) => item.name),
    ).toEqual(['projects'])
  } finally {
    await first.close()
    await second.close()
  }
})

it('MCP-03 queda do endpoint é indicada na descoberta', async () => {
  const server = await startMcpFixture(() => ({}))
  await server.close()
  await expect(
    new McpClientService(3000).listTools(server.endpoint),
  ).rejects.toMatchObject({ code: 'SOURCE_UNAVAILABLE' })
})

it('MCP-10 chamada acima do prazo retorna erro de tempo limite', async () => {
  const server = await startMcpFixture((method) =>
    method === 'tools/call'
      ? new Promise(() => {})
      : { tools: [tool('tickets')] },
  )
  try {
    await expect(
      new McpClientService(600).run(server.endpoint, (session) =>
        session.callTool({ name: 'tickets' }),
      ),
    ).rejects.toMatchObject({ status: 504, code: 'QUERY_TIMEOUT' })
  } finally {
    await server.close()
  }
})

it('MCP-18 endpoint protegido retorna erro de autorização', async () => {
  const server = await startMcpFixture(() => ({}), 401)
  const protectedCall = await startMcpFixture(
    () => ({ tools: [tool('tickets')] }),
    200,
    403,
  )
  try {
    const client = new McpClientService(3000)
    await expect(client.listTools(server.endpoint)).rejects.toMatchObject({
      status: 422,
      code: 'MCP_AUTH_REQUIRED',
    })
    expect(
      (await client.listTools(protectedCall.endpoint)).map((item) => item.name),
    ).toEqual(['tickets'])
    await expect(
      client.run(protectedCall.endpoint, (session) =>
        session.callTool({ name: 'tickets' }),
      ),
    ).rejects.toMatchObject({ status: 422, code: 'MCP_AUTH_REQUIRED' })
  } finally {
    await server.close()
    await protectedCall.close()
  }
})
