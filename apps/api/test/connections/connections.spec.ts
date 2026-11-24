import type { Role } from '@ninbi/contracts'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CONNECTION_VERIFY_TIMEOUT_MS,
  DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS,
} from '../../src/connections/connections.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connectionSchemas, connections } from '../../src/database/schema'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import { createConnection, createUser } from '../factories'
import { createTestApp } from '../harness'

const PASSWORD = 'senha-correta-123'
const NEO4J_ERROR = 'Neo.ClientError.Security.Unauthorized: credenciais'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup(options: Parameters<typeof createTestApp>[0] = {}) {
  const test = await createTestApp(options)
  close = test.close
  const crypto = test.app.get(CryptoService)
  const as = async (role: Role) => {
    const email = `${role.toLowerCase()}@x.com`
    await createUser(test.db, { name: role, email, role })
    const agent = request.agent(test.app.getHttpServer())
    const login = await agent
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
    expect(login.status).toBe(200)
    return agent
  }
  const rows = () => test.db.select().from(connections)
  return { ...test, crypto, as, rows }
}

const validBody = {
  name: 'Vendas',
  uri: 'neo4j+s://vendas.exemplo:7687',
  database: 'vendas',
  username: 'neo4j',
  password: 's3nh@-Neo4j',
}

describe('listar conexões', () => {
  it('CONN-01 lista conexões com nome, URI, banco e última leitura em ordem de nome', async () => {
    const t = await setup()
    const readAt = new Date('2026-11-16T17:30:00Z')
    await createConnection(t.db, t.crypto, { name: 'vendas', database: 'db1' })
    const analytics = await createConnection(t.db, t.crypto, {
      name: 'Analytics',
    })
    await createConnection(t.db, t.crypto, { name: 'Zeta' })
    await t.db
      .insert(connectionSchemas)
      .values({ connectionId: analytics.id, readAt, document: {} })

    for (const role of ['ADMIN', 'EDITOR'] as const) {
      const response = await (await t.as(role)).get('/api/connections')
      expect(response.status).toBe(200)
      const list = response.body as Array<Record<string, unknown>>
      expect(list.map((c) => c.name)).toEqual(['Analytics', 'vendas', 'Zeta'])
      expect(list[0]).toMatchObject({
        name: 'Analytics',
        uri: 'neo4j://vendas.exemplo:7687',
        database: null,
        schemaReadAt: readAt.toISOString(),
      })
      expect(list[1]).toMatchObject({ database: 'db1', schemaReadAt: null })
    }
  })
})

describe('criar conexão', () => {
  it('CONN-06 testa a conexão no Neo4j antes de salvar', async () => {
    const t = await setup()
    t.neo4j.whenVerify(new Neo4jGatewayError(NEO4J_ERROR))
    const admin = await t.as('ADMIN')

    await admin.post('/api/connections').send(validBody)

    const verifies = t.neo4j.calls.filter((c) => c.method === 'verify')
    expect(verifies).toHaveLength(1)
    expect(verifies[0]?.cfg).toEqual({
      uri: validBody.uri,
      database: 'vendas',
      username: 'neo4j',
      password: 's3nh@-Neo4j',
    })
    expect(await t.rows()).toHaveLength(0)
  })

  it('CONN-07 teste aprovado salva a conexão e ela aparece na lista', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')

    const created = await admin.post('/api/connections').send(validBody)
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ name: 'Vendas', uri: validBody.uri })

    const list = await admin.get('/api/connections')
    expect((list.body as Array<{ name: string }>).map((c) => c.name)).toEqual([
      'Vendas',
    ])
  })

  it('CONN-08 teste reprovado não salva e devolve a mensagem do Neo4j', async () => {
    const t = await setup()
    t.neo4j.whenVerify(new Neo4jGatewayError(NEO4J_ERROR))

    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send(validBody)

    expect(response.status).toBe(422)
    expect(response.body).toMatchObject({
      code: 'NEO4J_UNAVAILABLE',
      message: NEO4J_ERROR,
    })
    expect(await t.rows()).toHaveLength(0)
  })

  it('CONN-09 Neo4j sem resposta no prazo devolve Não foi possível conectar em 10 s', async () => {
    const t = await setup({
      overrides: [{ provide: CONNECTION_VERIFY_TIMEOUT_MS, useValue: 100 }],
    })
    t.neo4j.whenVerify('hang')

    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send(validBody)

    expect(response.status).toBe(422)
    expect(response.body).toMatchObject({
      code: 'NEO4J_TIMEOUT',
      message: 'Não foi possível conectar em 10 s',
    })
    expect(await t.rows()).toHaveLength(0)
  })

  it('CONN-09 prazo padrão do teste de conexão é 10 s', async () => {
    const t = await setup()
    expect(t.app.get(CONNECTION_VERIFY_TIMEOUT_MS)).toBe(10_000)
    expect(DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS).toBe(10_000)
  })

  it('CONN-10 URI inválida responde 400 no campo uri', async () => {
    const t = await setup()

    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send({ ...validBody, uri: 'http://x' })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: { uri: 'URI inválida' },
    })
    expect(t.neo4j.calls).toHaveLength(0)
  })

  it('CONN-11 nome repetido sem diferenciar maiúsculas responde 409 no campo name', async () => {
    const t = await setup()
    await createConnection(t.db, t.crypto, { name: 'vendas' })

    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send({ ...validBody, name: 'VENDAS' })

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({
      code: 'CONNECTION_NAME_TAKEN',
      fieldErrors: { name: 'Já existe uma conexão com este nome' },
    })
    expect(t.neo4j.calls.filter((c) => c.method === 'verify')).toHaveLength(0)
  })

  it('CONN-12 banco vazio conecta sem banco e guarda null', async () => {
    const t = await setup()

    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send({ ...validBody, database: '' })

    expect(response.status).toBe(201)
    expect(t.neo4j.calls[0]?.cfg.database).toBeNull()
    const [row] = await t.rows()
    expect(row?.database).toBeNull()
  })

  it('CONN-13 senha guardada cifrada no PostgreSQL', async () => {
    const t = await setup()

    await (await t.as('ADMIN')).post('/api/connections').send(validBody)

    const [row] = await t.rows()
    expect(row?.passwordEncrypted.startsWith('v1:')).toBe(true)
    expect(row?.passwordEncrypted).not.toContain(validBody.password)
    expect(t.crypto.decrypt(row?.passwordEncrypted ?? '')).toBe(
      validBody.password,
    )
  })

  it('CONN-14 nenhuma resposta da API contém a senha', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')

    const created = await admin.post('/api/connections').send(validBody)
    const list = await admin.get('/api/connections')

    for (const response of [created, list]) {
      expect(response.text).not.toContain(validBody.password)
      expect(response.text).not.toMatch(/password/i)
    }
  })

  it('CONN-19 Editor e Visualizador recebem 403 ao criar conexão', async () => {
    const t = await setup()

    for (const role of ['EDITOR', 'VIEWER'] as const) {
      const response = await (await t.as(role))
        .post('/api/connections')
        .send(validBody)
      expect(response.status).toBe(403)
    }
    expect(await t.rows()).toHaveLength(0)
  })
})

describe('permissão de leitura', () => {
  it('CONN-19 Visualizador recebe 403 ao listar conexões', async () => {
    const t = await setup()
    const response = await (await t.as('VIEWER')).get('/api/connections')
    expect(response.status).toBe(403)
  })
})

describe('testar conexão sem salvar', () => {
  it('testa os dados informados sem gravar a conexão', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')

    const ok = await admin.post('/api/connections/test').send(validBody)
    expect(ok.status).toBe(200)
    expect(ok.body).toEqual({ ok: true })
    expect(await t.rows()).toHaveLength(0)

    t.neo4j.whenVerify(new Neo4jGatewayError(NEO4J_ERROR))
    const failed = await admin.post('/api/connections/test').send(validBody)
    expect(failed.status).toBe(422)
    expect(failed.body).toMatchObject({ message: NEO4J_ERROR })
  })

  it('só quem gerencia conexões pode testar', async () => {
    const t = await setup()
    const response = await (await t.as('EDITOR'))
      .post('/api/connections/test')
      .send(validBody)
    expect(response.status).toBe(403)
  })
})
