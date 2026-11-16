import { createServer, type Server, type Socket } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { DriverNeo4jGateway } from '../../src/neo4j/driver-neo4j.gateway'
import {
  Neo4jGatewayError,
  Neo4jTimeoutError,
} from '../../src/neo4j/neo4j.gateway'

const gateway = new DriverNeo4jGateway()
const servers: Server[] = []
const sockets: Socket[] = []

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

function listen(server: Server): Promise<number> {
  servers.push(server)
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : 0)
    })
  })
}

function config(port: number) {
  return {
    uri: `bolt://127.0.0.1:${port}`,
    database: null,
    username: 'neo4j',
    password: 'qualquer',
  }
}

describe('gateway do Neo4j (driver real, sem Neo4j)', () => {
  it('CONN-09 verify encerra no prazo com Neo4jTimeoutError', async () => {
    // Aceita a conexão e nunca responde ao handshake do Bolt.
    const port = await listen(
      createServer((socket) => {
        sockets.push(socket)
      }),
    )
    const started = Date.now()

    await expect(
      gateway.verify(config(port), { timeoutMs: 200 }),
    ).rejects.toBeInstanceOf(Neo4jTimeoutError)

    expect(Date.now() - started).toBeLessThan(2000)
  })

  it('CONN-08 porta fechada rejeita com Neo4jGatewayError', async () => {
    const port = await listen(createServer())
    await new Promise<void>((resolve) => servers.pop()?.close(() => resolve()))

    const error = await gateway
      .verify(config(port), { timeoutMs: 5000 })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Neo4jGatewayError)
    expect((error as Error).message).not.toContain('qualquer')
  })
})
