import type { Role } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import {
  connectionSchemas,
  connections,
  schemaExampleOptOuts,
} from '../../src/database/schema'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import { createConnection, createUser } from '../factories'
import { createTestApp } from '../harness'

const PASSWORD = 'senha-correta-123'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp()
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
  const connection = await createConnection(test.db, crypto, {
    name: 'Vendas',
    password: 'segredo-original',
  })
  const row = async () => {
    const [found] = await test.db
      .select()
      .from(connections)
      .where(eq(connections.id, connection.id))
    return found
  }
  return { ...test, crypto, as, connection, row }
}

const editBody = {
  name: 'Vendas',
  uri: 'neo4j://vendas.exemplo:7687',
  database: '',
  username: 'neo4j',
}

describe('editar conexão', () => {
  it('CONN-15 senha vazia na edição mantém a senha guardada', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')

    for (const body of [
      { ...editBody, name: 'Vendas 2', password: '' },
      { ...editBody, name: 'Vendas 3' },
    ]) {
      t.neo4j.calls.length = 0
      const response = await admin
        .patch(`/api/connections/${t.connection.id}`)
        .send(body)
      expect(response.status).toBe(200)
      expect(t.neo4j.calls[0]?.cfg.password).toBe('segredo-original')
      const stored = await t.row()
      expect(t.crypto.decrypt(stored?.passwordEncrypted ?? '')).toBe(
        'segredo-original',
      )
    }
  })

  it('CONN-16 edição testa a conexão de novo antes de gravar', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    t.neo4j.whenVerify(
      new Neo4jGatewayError('Neo.ClientError.Security.Unauthorized: x'),
    )

    const rejected = await admin
      .patch(`/api/connections/${t.connection.id}`)
      .send({ ...editBody, uri: 'bolt://novo:7687', password: 'outra' })
    expect(rejected.status).toBe(422)
    expect(rejected.body).toMatchObject({
      code: 'NEO4J_UNAVAILABLE',
      message: 'Neo.ClientError.Security.Unauthorized: x',
    })
    expect((await t.row())?.uri).toBe('neo4j://vendas.exemplo:7687')

    t.neo4j.whenVerify('ok')
    const accepted = await admin
      .patch(`/api/connections/${t.connection.id}`)
      .send({ ...editBody, uri: 'bolt://novo:7687', password: 'outra' })
    expect(accepted.status).toBe(200)
    expect((await t.row())?.uri).toBe('bolt://novo:7687')
    expect(t.crypto.decrypt((await t.row())?.passwordEncrypted ?? '')).toBe(
      'outra',
    )
  })

  it('CONN-14 resposta da edição não contém a senha', async () => {
    const t = await setup()

    const response = await (await t.as('ADMIN'))
      .patch(`/api/connections/${t.connection.id}`)
      .send({ ...editBody, password: 'nova-senha-secreta' })

    expect(response.status).toBe(200)
    expect(response.text).not.toContain('nova-senha-secreta')
    expect(response.text).not.toContain('segredo-original')
    expect(response.text).not.toMatch(/password/i)
  })

  it('CONN-16 edição de conexão inexistente responde 404', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')

    for (const id of ['2f1c3a52-6a39-4d0b-9a9c-0b8c1f4a7e11', 'nao-e-uuid']) {
      const response = await admin.patch(`/api/connections/${id}`).send({
        ...editBody,
        password: 'x',
      })
      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({ code: 'CONNECTION_NOT_FOUND' })
    }
  })
})

describe('excluir conexão', () => {
  it('CONN-18 excluir apaga a conexão e o schema guardado', async () => {
    const t = await setup()
    await t.db.insert(connectionSchemas).values({
      connectionId: t.connection.id,
      readAt: new Date(),
      document: {},
    })
    await t.db.insert(schemaExampleOptOuts).values({
      connectionId: t.connection.id,
      elementKind: 'LABEL',
      elementName: 'Cliente',
      propertyName: 'email',
    })

    const response = await (await t.as('ADMIN')).delete(
      `/api/connections/${t.connection.id}`,
    )

    expect(response.status).toBe(204)
    expect(await t.db.select().from(connections)).toHaveLength(0)
    expect(await t.db.select().from(connectionSchemas)).toHaveLength(0)
    expect(await t.db.select().from(schemaExampleOptOuts)).toHaveLength(0)
  })

  it('CONN-18 exclusão de conexão inexistente responde 404', async () => {
    const t = await setup()
    const response = await (await t.as('ADMIN')).delete(
      '/api/connections/2f1c3a52-6a39-4d0b-9a9c-0b8c1f4a7e11',
    )
    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ code: 'CONNECTION_NOT_FOUND' })
  })
})

describe('permissão de gestão', () => {
  it('CONN-19 Editor e Visualizador recebem 403 ao editar e excluir conexão', async () => {
    const t = await setup()

    for (const role of ['EDITOR', 'VIEWER'] as const) {
      const agent = await t.as(role)
      const patch = await agent
        .patch(`/api/connections/${t.connection.id}`)
        .send({ ...editBody, name: 'Invadida', password: 'x' })
      const del = await agent.delete(`/api/connections/${t.connection.id}`)
      expect(patch.status).toBe(403)
      expect(del.status).toBe(403)
    }
    expect((await t.row())?.name).toBe('Vendas')
  })
})
