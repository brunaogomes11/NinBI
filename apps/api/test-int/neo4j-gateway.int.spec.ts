import neo4j from 'neo4j-driver'
import { afterAll, describe, expect, it } from 'vitest'
import { DriverNeo4jGateway } from '../src/neo4j/driver-neo4j.gateway'
import { Neo4jGatewayError } from '../src/neo4j/neo4j.gateway'

// Neo4j do docker-compose.dev.yml.
const cfg = {
  uri: 'bolt://localhost:7688',
  database: null,
  username: 'neo4j',
  password: 'ninbi-dev-password',
}
const gateway = new DriverNeo4jGateway()
const probe = neo4j.driver(
  cfg.uri,
  neo4j.auth.basic(cfg.username, cfg.password),
)

afterAll(async () => {
  await probe.close()
})

describe('gateway do Neo4j contra o Neo4j de dev', () => {
  it('verify com as credenciais certas resolve', async () => {
    await expect(
      gateway.verify(cfg, { timeoutMs: 10_000 }),
    ).resolves.toBeUndefined()
  })

  it('CONN-08 senha errada rejeita com a mensagem do Neo4j', async () => {
    const error = await gateway
      .verify({ ...cfg, password: 'senha-errada-123' }, { timeoutMs: 10_000 })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Neo4jGatewayError)
    expect((error as Error).message).toContain('unauthorized')
    expect((error as Error).message).not.toContain('senha-errada-123')
  })

  it('CONN-12 sem banco a sessão usa o banco padrão do servidor', async () => {
    const result = await gateway.read(
      { ...cfg, database: null },
      'CALL db.info() YIELD name RETURN name',
      {},
      { timeoutMs: 10_000 },
    )

    expect(result.rows).toEqual([{ name: 'neo4j' }])
  })

  it('SCH-12 leitura usa transação de leitura e recusa escrita', async () => {
    await expect(
      gateway.read(cfg, 'CREATE (:NinbiWriteProbe)', {}, { timeoutMs: 10_000 }),
    ).rejects.toBeInstanceOf(Neo4jGatewayError)

    const count = await probe.executeQuery(
      'MATCH (n:NinbiWriteProbe) RETURN count(n) AS total',
    )
    expect(count.records[0]?.get('total').toNumber()).toBe(0)
  })
})
