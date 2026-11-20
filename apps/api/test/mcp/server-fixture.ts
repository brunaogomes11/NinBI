import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

export async function startMcpFixture(
  handler: (method: string, params: unknown) => unknown,
  status = 200,
) {
  const server = createServer(async (req, res) => {
    if (status !== 200 || req.method !== 'POST') {
      res.writeHead(status !== 200 ? status : 405).end()
      return
    }
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    const message = JSON.parse(Buffer.concat(chunks).toString())
    if (message.id === undefined) {
      res.writeHead(202).end()
      return
    }
    const result =
      message.method === 'initialize'
        ? {
            protocolVersion: '2025-11-25',
            capabilities: { tools: {} },
            serverInfo: { name: 'test', version: '1' },
          }
        : await handler(message.method, message.params)
    res
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
        server.closeAllConnections()
      }),
  }
}
