import type { Role } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CONNECTION_VERIFY_TIMEOUT_MS,
  DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS,
} from '../../src/connections/connections.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connections } from '../../src/database/schema'
import { SourceGatewayError } from '../../src/sources/source'
import { createConnection, createUser } from '../factories'
import { createTestApp } from '../harness'

const PASSWORD = 'senha-correta-123'

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
  return { ...test, crypto, as, rows, pg: test.sql.POSTGRES }
}

const sqlBody = {
  type: 'POSTGRES',
  name: 'Sortify',
  host: 'pg.exemplo',
  port: 5432,
  database: 'sortify',
  ssl: true,
  username: 'leitor',
  password: 's3nh@-Pg',
}

describe('conexão SQL', () => {
  it('SRC-05 criar conexão SQL testa antes de salvar', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    t.pg.whenVerify(new SourceGatewayError('recusada'))
    const refused = await admin.post('/api/connections').send(sqlBody)
    expect(refused.status).toBe(422)
    expect(await t.rows()).toHaveLength(0)

    t.pg.whenVerify('ok')
    const created = await admin.post('/api/connections').send(sqlBody)
    expect(created.status).toBe(201)
    const verifies = t.pg.calls.filter((call) => call.method === 'verify')
    expect(verifies).toHaveLength(2)
    expect(verifies[1]?.cfg).toEqual({
      host: 'pg.exemplo',
      port: 5432,
      database: 'sortify',
      username: 'leitor',
      password: 's3nh@-Pg',
      ssl: true,
    })
    expect(t.neo4j.calls.filter((c) => c.method === 'verify')).toEqual([])
    expect(await t.rows()).toHaveLength(1)
  })

  it('cria conexão SQL sem senha para banco público', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const { password: _password, ...withoutPassword } = sqlBody

    const created = await admin.post('/api/connections').send(withoutPassword)

    expect(created.status).toBe(201)
    const [row] = await t.rows()
    expect(t.crypto.decrypt(row?.passwordEncrypted ?? '')).toBe('')
  })

  it('SRC-06 teste que passa salva e a conexão aparece na lista', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const created = await admin.post('/api/connections').send(sqlBody)
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      name: 'Sortify',
      type: 'POSTGRES',
      uri: null,
      host: 'pg.exemplo',
      port: 5432,
      ssl: true,
      database: 'sortify',
      username: 'leitor',
    })
    const list = await admin.get('/api/connections')
    expect(list.body).toEqual([
      expect.objectContaining({
        id: created.body.id,
        type: 'POSTGRES',
        host: 'pg.exemplo',
        port: 5432,
      }),
    ])
    const [row] = await t.rows()
    expect(row).toMatchObject({
      type: 'POSTGRES',
      uri: null,
      host: 'pg.exemplo',
      port: 5432,
      ssl: true,
    })
  })

  it('SRC-07 teste que falha não salva e devolve a mensagem do banco', async () => {
    const t = await setup()
    const message = 'password authentication failed for user "leitor"'
    t.pg.whenVerify(new SourceGatewayError(message, '28P01'))
    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send(sqlBody)
    expect(response.status).toBe(422)
    expect(response.body).toMatchObject({ code: 'SOURCE_UNAVAILABLE', message })
    expect(await t.rows()).toHaveLength(0)
  })

  it('SRC-08 banco SQL que não responde em 10 s devolve a mensagem de prazo', async () => {
    // O prazo real é 10 s; o teste o encurta só para não esperar.
    expect(DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS).toBe(10_000)
    const t = await setup({
      overrides: [{ provide: CONNECTION_VERIFY_TIMEOUT_MS, useValue: 100 }],
    })
    t.sql.MYSQL.whenVerify('hang')
    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send({ ...sqlBody, type: 'MYSQL', port: 3306 })
    expect(response.status).toBe(422)
    expect(response.body).toMatchObject({
      code: 'SOURCE_TIMEOUT',
      message: 'Não foi possível conectar em 10 s',
    })
    expect(t.sql.MYSQL.calls[0]?.method).toBe('verify')
    expect(await t.rows()).toHaveLength(0)
  })

  it('SRC-16 trocar o tipo de uma conexão é recusado', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const sql = await createConnection(t.db, t.crypto, {
      name: 'Sortify',
      type: 'POSTGRES',
    })
    const graph = await createConnection(t.db, t.crypto, { name: 'Grafo' })
    const { type: _type, ...sqlFields } = sqlBody
    const attempts = [
      [sql.id, { ...sqlBody, type: 'MYSQL' }],
      [
        sql.id,
        {
          name: 'Sortify',
          uri: 'neo4j://x:7687',
          database: null,
          username: 'neo4j',
        },
      ],
      [graph.id, { ...sqlFields, type: 'SQLSERVER', name: 'Grafo' }],
    ] as const
    for (const [id, body] of attempts) {
      const response = await admin.patch(`/api/connections/${id}`).send(body)
      expect(response.status).toBe(422)
      expect(response.body).toMatchObject({
        code: 'CONNECTION_TYPE_LOCKED',
        message: 'O tipo da conexão não muda',
      })
    }
    const rows = await t.rows()
    expect(rows.map((row) => [row.name, row.type]).sort()).toEqual([
      ['Grafo', 'NEO4J'],
      ['Sortify', 'POSTGRES'],
    ])
    for (const gateway of [t.neo4j, ...Object.values(t.sql)]) {
      expect(gateway.calls).toEqual([])
    }
  })

  it('SRC-17 editar conexão SQL sem senha mantém a senha e testa de novo', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const sql = await createConnection(t.db, t.crypto, {
      name: 'Sortify',
      type: 'POSTGRES',
      password: 'guardada',
    })
    const { password: _password, ...withoutPassword } = sqlBody

    t.pg.whenVerify(new SourceGatewayError('host não encontrado'))
    const refused = await admin
      .patch(`/api/connections/${sql.id}`)
      .send({ ...withoutPassword, host: 'outro.exemplo' })
    expect(refused.status).toBe(422)
    const [unchanged] = await t.rows()
    expect(unchanged?.host).toBe('sql.exemplo')

    t.pg.whenVerify('ok')
    const updated = await admin
      .patch(`/api/connections/${sql.id}`)
      .send({ ...withoutPassword, password: '', host: 'novo.exemplo' })
    expect(updated.status).toBe(200)
    expect(updated.body).toMatchObject({
      host: 'novo.exemplo',
      type: 'POSTGRES',
    })
    const verifies = t.pg.calls.filter((call) => call.method === 'verify')
    expect(verifies.map((call) => call.cfg.password)).toEqual([
      'guardada',
      'guardada',
    ])
    expect(verifies[1]?.cfg.host).toBe('novo.exemplo')
    const [row] = await t.rows()
    expect(row?.passwordEncrypted).toBe(sql.passwordEncrypted)
    expect(row?.host).toBe('novo.exemplo')
  })

  it('SRC-18 senha SQL fica criptografada e nunca volta na resposta', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const created = await admin.post('/api/connections').send(sqlBody)
    expect(created.status).toBe(201)
    const [row] = await t.rows()
    expect(row?.passwordEncrypted).not.toContain(sqlBody.password)
    expect(t.crypto.decrypt(row?.passwordEncrypted ?? '')).toBe(
      sqlBody.password,
    )

    const updated = await admin
      .patch(`/api/connections/${created.body.id}`)
      .send({ ...sqlBody, password: 'nova-senha-pg' })
    const list = await admin.get('/api/connections')
    for (const response of [created, updated, list]) {
      const text = JSON.stringify(response.body)
      expect(text).not.toContain(sqlBody.password)
      expect(text).not.toContain('nova-senha-pg')
      expect(text).not.toContain('password')
    }
    const [after] = await t.rows()
    expect(t.crypto.decrypt(after?.passwordEncrypted ?? '')).toBe(
      'nova-senha-pg',
    )
  })

  it('SRC-19 nome repetido de conexão SQL é recusado com a mensagem no campo', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    await createConnection(t.db, t.crypto, { name: 'Sortify' })
    const taken = await admin
      .post('/api/connections')
      .send({ ...sqlBody, name: 'SORTIFY' })
    expect(taken.status).toBe(409)
    expect(taken.body).toMatchObject({
      code: 'CONNECTION_NAME_TAKEN',
      fieldErrors: { name: expect.any(String) },
    })
    for (const name of ['', 'x'.repeat(81)]) {
      const invalid = await admin
        .post('/api/connections')
        .send({ ...sqlBody, name })
      expect(invalid.status).toBe(400)
      expect(invalid.body.fieldErrors?.name).toEqual(expect.any(String))
    }
    expect(t.pg.calls).toEqual([])
    expect(await t.rows()).toHaveLength(1)
  })

  it('SRC-20 Editor e Visualizador recebem 403 ao gerir conexão SQL', async () => {
    const t = await setup()
    const sql = await createConnection(t.db, t.crypto, {
      name: 'Sortify',
      type: 'POSTGRES',
    })
    for (const role of ['EDITOR', 'VIEWER'] as const) {
      const agent = await t.as(role)
      const responses = [
        await agent.post('/api/connections').send(sqlBody),
        await agent.patch(`/api/connections/${sql.id}`).send(sqlBody),
        await agent.delete(`/api/connections/${sql.id}`),
      ]
      for (const response of responses) expect(response.status).toBe(403)
    }
    expect(t.pg.calls).toEqual([])
    expect(await t.rows()).toHaveLength(1)
  })

  it('SRC-21 mensagem do driver sobre SSL chega ao formulário', async () => {
    const t = await setup()
    const message = 'The server does not support SSL connections'
    t.pg.whenVerify(new SourceGatewayError(message))
    const response = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send(sqlBody)
    expect(response.status).toBe(422)
    expect(response.body).toMatchObject({ code: 'SOURCE_UNAVAILABLE', message })
    expect(t.pg.calls[0]?.cfg.ssl).toBe(true)
    expect(await t.rows()).toHaveLength(0)
  })

  it('SCS-01 criar conexão SQL inicia a leitura do schema', async () => {
    const t = await setup()
    const created = await (await t.as('ADMIN'))
      .post('/api/connections')
      .send(sqlBody)
    expect(created.status).toBe(201)
    expect(created.body.schemaStatus).toBe('READING')
    const [row] = await t.db
      .select()
      .from(connections)
      .where(eq(connections.id, created.body.id))
    expect(row?.schemaReadStartedAt).not.toBeNull()
  })
})
