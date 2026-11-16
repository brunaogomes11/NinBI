import type { ConnectionSchemaDto, Role } from '@ninbi/contracts'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { SchemaRefreshService } from '../../src/schema/schema-refresh.service'
import { createConnection, createUser } from '../factories'
import { programSchema, type SchemaFixture } from '../fakes/schema-fixture'
import { createTestApp } from '../harness'

const PASSWORD = 'senha-correta-123'

const fixture: SchemaFixture = {
  nodes: [
    {
      labels: ['Cliente'],
      properties: [
        { name: 'nome', types: ['String'], example: 'Ana' },
        { name: 'email', types: ['String'], example: 'ana@x.com' },
      ],
    },
    {
      labels: ['Pedido'],
      properties: [{ name: 'codigo', types: ['String'], example: 'PED-1' }],
    },
  ],
  relationships: [
    { type: 'FEZ', properties: [], patterns: [['Cliente', 'Pedido']] },
  ],
}

let current: Awaited<ReturnType<typeof setup>> | undefined

afterEach(async () => {
  current?.neo4j.release()
  await current?.close()
  current = undefined
})

async function setup(schema: SchemaFixture = fixture) {
  const test = await createTestApp()
  programSchema(test.neo4j, schema)
  const crypto = test.app.get(CryptoService)
  const refresh = test.app.get(SchemaRefreshService)
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
  /** Conexão já com o schema lido. */
  const readConnection = async () => {
    const connection = await createConnection(test.db, crypto)
    await refresh.start(connection.id)
    await refresh.whenSettled(connection.id)
    return connection
  }
  const result = { ...test, crypto, refresh, as, readConnection }
  current = result
  return result
}

const schemaUrl = (id: string) => `/api/connections/${id}/schema`

describe('rotas do schema', () => {
  it('SCH-01 criar a conexão lê o schema sem outra ação', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')

    const created = await admin.post('/api/connections').send({
      name: 'Vendas',
      uri: 'neo4j://vendas.exemplo:7687',
      database: '',
      username: 'neo4j',
      password: 'segredo',
    })
    expect(created.status).toBe(201)
    await t.refresh.whenSettled(created.body.id)

    const reads = t.neo4j.calls.length
    const schema = await admin.get(schemaUrl(created.body.id))
    expect(schema.status).toBe(200)
    const body = schema.body as ConnectionSchemaDto
    expect(body.status).toBe('READY')
    expect(body.labels.map((label) => label.name)).toEqual([
      'Cliente',
      'Pedido',
    ])
    expect(t.neo4j.calls).toHaveLength(reads)
  })

  it('SCH-07 Atualizar schema lê de novo', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const connection = await t.readConnection()
    const before = (await admin.get(schemaUrl(connection.id)))
      .body as ConnectionSchemaDto

    t.clock.advance(60_000)
    programSchema(t.neo4j, {
      ...fixture,
      nodes: [
        {
          labels: ['Cliente'],
          properties: [
            { name: 'nome', types: ['String'], example: 'Ana' },
            { name: 'cidade', types: ['String'], example: 'Recife' },
          ],
        },
      ],
    })
    const refresh = await admin.post(`${schemaUrl(connection.id)}/refresh`)
    expect(refresh.status).toBe(202)
    await t.refresh.whenSettled(connection.id)

    const after = (await admin.get(schemaUrl(connection.id)))
      .body as ConnectionSchemaDto
    expect(
      after.labels[0]?.properties.map((property) => property.name),
    ).toEqual(['cidade', 'nome'])
    expect(after.readAt).not.toBe(before.readAt)
    expect(after.readAt).toBe(t.clock.now().toISOString())
  })

  it('SCH-08 estado READING durante a leitura', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    t.neo4j.whenRead('db.schema.nodeTypeProperties', 'hang')
    const connection = await createConnection(t.db, t.crypto)

    const started = await admin.post(`${schemaUrl(connection.id)}/refresh`)
    expect(started.status).toBe(202)
    expect(started.body.status).toBe('READING')
    const get = await admin.get(schemaUrl(connection.id))
    expect(get.body.status).toBe('READING')
    const again = await admin.post(`${schemaUrl(connection.id)}/refresh`)
    expect(again.body.status).toBe('READING')
  })

  it('SCH-13 Visualizador recebe 403 na leitura e na consulta do schema', async () => {
    const t = await setup()
    const connection = await t.readConnection()

    const viewer = await t.as('VIEWER')
    expect((await viewer.get(schemaUrl(connection.id))).status).toBe(403)
    expect(
      (await viewer.post(`${schemaUrl(connection.id)}/refresh`)).status,
    ).toBe(403)

    const editor = await t.as('EDITOR')
    expect((await editor.get(schemaUrl(connection.id))).status).toBe(200)
    const refresh = await editor.post(`${schemaUrl(connection.id)}/refresh`)
    expect(refresh.status).toBe(202)
    await t.refresh.whenSettled(connection.id)
  })

  it('SCH-15 schema volta com labels e tipos em ordem alfabética', async () => {
    const t = await setup({
      nodes: [
        {
          labels: ['Zeta'],
          properties: [
            { name: 'b', types: ['Long', 'String'], example: '1' },
            { name: 'a', types: ['String'], example: 'x' },
          ],
        },
        { labels: ['alfa'], properties: [] },
        { labels: ['Beta'], properties: [] },
      ],
      relationships: [
        { type: 'Z_REL', properties: [], patterns: [['Zeta', 'alfa']] },
        { type: 'a_rel', properties: [], patterns: [['alfa', 'Beta']] },
      ],
    })
    const admin = await t.as('ADMIN')
    const connection = await t.readConnection()

    const body = (await admin.get(schemaUrl(connection.id)))
      .body as ConnectionSchemaDto

    expect(body.labels.map((label) => label.name)).toEqual([
      'alfa',
      'Beta',
      'Zeta',
    ])
    expect(body.relationshipTypes.map((type) => type.name)).toEqual([
      'a_rel',
      'Z_REL',
    ])
    const zeta = body.labels[2]
    expect(zeta?.properties.map((property) => property.name)).toEqual([
      'a',
      'b',
    ])
    expect(zeta?.properties[1]?.types).toEqual(['Long', 'String'])
    expect(body.connectionName).toBe('Vendas')
  })

  it('SCH-22 Admin desliga o envio do exemplo e o schema mostra sendExample false', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const connection = await t.readConnection()
    const url = `${schemaUrl(connection.id)}/example-settings`
    const flags = async () => {
      const body = (await admin.get(schemaUrl(connection.id)))
        .body as ConnectionSchemaDto
      return body.labels.flatMap((label) =>
        label.properties.map(
          (property) =>
            `${label.name}.${property.name}=${property.sendExample}`,
        ),
      )
    }

    const off = await admin.put(url).send({
      kind: 'LABEL',
      element: 'Cliente',
      property: 'email',
      sendExample: false,
    })
    expect(off.status).toBe(204)
    expect(await flags()).toEqual([
      'Cliente.email=false',
      'Cliente.nome=true',
      'Pedido.codigo=true',
    ])

    const on = await admin.put(url).send({
      kind: 'LABEL',
      element: 'Cliente',
      property: 'email',
      sendExample: true,
    })
    expect(on.status).toBe(204)
    expect(await flags()).toEqual([
      'Cliente.email=true',
      'Cliente.nome=true',
      'Pedido.codigo=true',
    ])
  })

  it('SCH-22 propriedade inexistente responde 404 SCHEMA_PROPERTY_NOT_FOUND', async () => {
    const t = await setup()
    const admin = await t.as('ADMIN')
    const connection = await t.readConnection()

    const response = await admin
      .put(`${schemaUrl(connection.id)}/example-settings`)
      .send({
        kind: 'LABEL',
        element: 'Cliente',
        property: 'inexistente',
        sendExample: false,
      })

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ code: 'SCHEMA_PROPERTY_NOT_FOUND' })
  })

  it('SCH-24 Editor recebe 403 ao mudar Enviar exemplo à IA', async () => {
    const t = await setup()
    const connection = await t.readConnection()
    const editor = await t.as('EDITOR')

    const response = await editor
      .put(`${schemaUrl(connection.id)}/example-settings`)
      .send({
        kind: 'LABEL',
        element: 'Cliente',
        property: 'email',
        sendExample: false,
      })

    expect(response.status).toBe(403)
    const admin = await t.as('ADMIN')
    const body = (await admin.get(schemaUrl(connection.id)))
      .body as ConnectionSchemaDto
    expect(
      body.labels[0]?.properties.every((property) => property.sendExample),
    ).toBe(true)
  })
})
