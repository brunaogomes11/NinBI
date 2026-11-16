import neo4j from 'neo4j-driver'
import { afterEach, describe, expect, it } from 'vitest'
import { PasswordHasher } from '../src/auth/password-hasher'
import { CryptoService } from '../src/crypto/crypto.service'
import { connections, dashboards, users } from '../src/database/schema'
import {
  NEO4J_GATEWAY,
  type Neo4jGateway,
  Neo4jGatewayError,
} from '../src/neo4j/neo4j.gateway'
import { QUERY_TIMEOUT_MS } from '../src/queries/query.service'
import { createIntApp } from './harness'

// Neo4j do docker-compose.dev.yml, com o dataset "Varejo".
const NEO4J_DEV = {
  uri: 'bolt://localhost:7688',
  username: 'neo4j',
  password: 'ninbi-dev-password',
}

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup(
  options: { timeoutMs?: number; uri?: string; name?: string } = {},
) {
  const test = await createIntApp({
    realNeo4j: true,
    overrides:
      options.timeoutMs === undefined
        ? []
        : [{ provide: QUERY_TIMEOUT_MS, useValue: options.timeoutMs }],
  })
  close = test.close
  const [owner] = await test.db
    .insert(users)
    .values({
      name: 'Ana',
      email: 'ana@x.com',
      passwordHash: await new PasswordHasher().hash('senha-correta-123'),
      role: 'EDITOR',
    })
    .returning()
  const [connection] = await test.db
    .insert(connections)
    .values({
      name: options.name ?? 'Varejo',
      uri: options.uri ?? NEO4J_DEV.uri,
      username: NEO4J_DEV.username,
      passwordEncrypted: test.app
        .get(CryptoService)
        .encrypt(NEO4J_DEV.password),
    })
    .returning()
  if (!owner || !connection) throw new Error('seed falhou')
  const [dashboard] = await test.db
    .insert(dashboards)
    .values({ name: 'Painel', ownerId: owner.id, connectionId: connection.id })
    .returning()
  if (!dashboard) throw new Error('dashboard não criado')
  const login = await test.http
    .post('/api/auth/login')
    .send({ email: 'ana@x.com', password: 'senha-correta-123' })
  expect(login.status).toBe(200)
  const run = (cypher: string) =>
    test.http.post(`/api/dashboards/${dashboard.id}/query`).send({ cypher })
  return { ...test, run }
}

describe('execução de consultas no Neo4j real', () => {
  it('QRY-01 procedimento de escrita é recusado pela transação de leitura e nada é criado', async () => {
    const t = await setup()
    const write = await t.run("CALL db.createLabel('NinbiProbe')")
    expect(write.status).toBe(422)
    expect(write.body.code).toBe('QUERY_WRITE_BLOCKED')

    // `db.labels()` não lista tokens criados por `db.createLabel`: a prova de que nada foi
    // gravado usa uma escrita visível (um nó) pela mesma transação de leitura do gateway.
    const probe = neo4j.driver(
      NEO4J_DEV.uri,
      neo4j.auth.basic(NEO4J_DEV.username, NEO4J_DEV.password),
    )
    try {
      await expect(
        t.app.get<Neo4jGateway>(NEO4J_GATEWAY).read(
          {
            uri: NEO4J_DEV.uri,
            database: null,
            username: NEO4J_DEV.username,
            password: NEO4J_DEV.password,
          },
          'CREATE (:NinbiQry01Probe)',
          {},
          { timeoutMs: 10_000 },
        ),
      ).rejects.toBeInstanceOf(Neo4jGatewayError)
      const count = await probe.executeQuery(
        'MATCH (n:NinbiQry01Probe) RETURN count(n) AS total',
      )
      expect(count.records[0]?.get('total').toNumber()).toBe(0)
    } finally {
      await probe.executeQuery('MATCH (n:NinbiQry01Probe) DETACH DELETE n')
      await probe.close()
    }
  })

  it('QRY-06 Neo4j real recusa CALL db.createLabel com a mensagem de leitura', async () => {
    const t = await setup()
    const res = await t.run("CALL db.createLabel('NinbiProbe')")
    expect(res.status).toBe(422)
    expect(res.body.message).toBe('Somente consultas de leitura são permitidas')
  })

  it('QRY-07 produto cartesiano no Neo4j real para no prazo', async () => {
    const t = await setup({ timeoutMs: 1_000 })
    const started = Date.now()
    const res = await t.run(
      'MATCH (a), (b), (c) WHERE elementId(a) <> elementId(b) AND elementId(b) <> elementId(c) RETURN count(*)',
    )
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('QUERY_TIMEOUT')
    expect(res.body.message).toBe('A consulta excedeu o tempo limite de 1 s')
  })

  it('QRY-07 a transação deixa de existir no Neo4j depois do prazo', async () => {
    const t = await setup({ timeoutMs: 1_000 })
    const marker = 'ninbi_qry07_cancel_probe'
    const res = await t.run(
      `// ${marker}
MATCH (a), (b), (c) WHERE elementId(a) <> elementId(b) AND elementId(b) <> elementId(c) RETURN count(*)`,
    )
    expect(res.body.code).toBe('QUERY_TIMEOUT')

    const probe = neo4j.driver(
      NEO4J_DEV.uri,
      neo4j.auth.basic(NEO4J_DEV.username, NEO4J_DEV.password),
    )
    try {
      let running = -1
      for (let attempt = 0; attempt < 20; attempt++) {
        const listed = await probe.executeQuery(
          'SHOW TRANSACTIONS YIELD currentQuery WHERE currentQuery CONTAINS $marker AND NOT currentQuery CONTAINS $self RETURN count(*) AS total',
          { marker, self: 'SHOW TRANSACTIONS' },
        )
        running = listed.records[0]?.get('total').toNumber() ?? -1
        if (running === 0) break
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      expect(running).toBe(0)
    } finally {
      await probe.close()
    }
  })

  it('QRY-08 UNWIND de 6000 linhas devolve 5000', async () => {
    const t = await setup()
    const res = await t.run('UNWIND range(1, 6000) AS i RETURN i')
    expect(res.status).toBe(200)
    expect(res.body.rows).toHaveLength(5_000)
    expect(res.body.truncated).toBe(true)
    expect(res.body.rowLimit).toBe(5_000)
    expect(res.body.rows[0]).toEqual([1])
    expect(res.body.rows[4_999]).toEqual([5_000])
  })

  it('QRY-13 porta fechada mostra Não foi possível conectar ao banco', async () => {
    const t = await setup({ uri: 'bolt://localhost:1', name: 'Fora do ar' })
    const res = await t.run('RETURN 1')
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('NEO4J_UNAVAILABLE')
    expect(res.body.message).toBe(
      'Não foi possível conectar ao banco Fora do ar',
    )
  })

  it('QRY-08 consulta de lojas devolve as 12 do Varejo', async () => {
    const t = await setup()
    const res = await t.run(
      'MATCH (l:Loja) RETURN l.nome AS nome ORDER BY nome',
    )
    expect(res.status).toBe(200)
    expect(res.body.columns).toEqual(['nome'])
    expect(res.body.rows).toHaveLength(12)
    expect(res.body.truncated).toBe(false)
  })
})
