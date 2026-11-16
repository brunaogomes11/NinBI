import { Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import {
  connectionSchemas,
  connections,
  schemaExampleOptOuts,
} from '../../src/database/schema'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import {
  SCHEMA_READ_TIMEOUT_MS,
  SchemaRefreshService,
} from '../../src/schema/schema-refresh.service'
import { createConnection } from '../factories'
import { programSchema, type SchemaFixture } from '../fakes/schema-fixture'
import { createTestApp } from '../harness'

const initial: SchemaFixture = {
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
      properties: [{ name: 'codigo', types: ['String'], example: 'PED-0001' }],
    },
  ],
  relationships: [
    { type: 'FEZ', properties: [], patterns: [['Cliente', 'Pedido']] },
  ],
}

let current: Awaited<ReturnType<typeof createTestApp>> | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  await current?.close()
  current = undefined
})

async function setup(timeoutMs?: number) {
  const test = await createTestApp({
    overrides:
      timeoutMs === undefined
        ? []
        : [{ provide: SCHEMA_READ_TIMEOUT_MS, useValue: timeoutMs }],
  })
  current = test
  programSchema(test.neo4j, initial)
  const refresh = test.app.get(SchemaRefreshService)
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const stored = async () => {
    const [row] = await test.db
      .select()
      .from(connectionSchemas)
      .where(eq(connectionSchemas.connectionId, connection.id))
    return row
  }
  const row = async () => {
    const [found] = await test.db
      .select()
      .from(connections)
      .where(eq(connections.id, connection.id))
    return found
  }
  const readOnce = async () => {
    await refresh.start(connection.id)
    await refresh.whenSettled(connection.id)
  }
  return { ...test, refresh, connection, stored, row, readOnce }
}

function schemaLogs() {
  const spy = vi.spyOn(Logger.prototype, 'log')
  return () =>
    spy.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.startsWith('schema read'))
}

describe('leitura e cache do schema', () => {
  it('SCH-06 leitura substitui o schema anterior com data e hora', async () => {
    const t = await setup()
    await t.readOnce()
    const first = await t.stored()
    expect(first?.readAt).toEqual(t.clock.now())
    expect((await t.row())?.schemaStatus).toBe('READY')

    t.clock.advance(60_000)
    programSchema(t.neo4j, {
      ...initial,
      nodes: [
        {
          labels: ['Loja'],
          properties: [{ name: 'cidade', types: ['String'] }],
        },
      ],
    })
    await t.readOnce()

    const second = await t.stored()
    expect(second?.readAt).toEqual(t.clock.now())
    expect(second?.readAt.getTime()).toBeGreaterThan(
      first?.readAt.getTime() ?? 0,
    )
    const document = second?.document as
      | { labels: { name: string }[] }
      | undefined
    expect(document?.labels.map((label) => label.name)).toEqual(['Loja'])
  })

  it('SCH-09 falha mantém o schema anterior e guarda a mensagem do Neo4j', async () => {
    const t = await setup()
    await t.readOnce()
    const before = await t.stored()
    const message = 'Neo.ClientError.Security.Forbidden: sem permissão'
    t.clock.advance(60_000)
    t.neo4j.whenRead(
      'db.schema.nodeTypeProperties',
      new Neo4jGatewayError(message),
    )

    await t.readOnce()

    const connection = await t.row()
    expect(connection?.schemaStatus).toBe('FAILED')
    expect(connection?.schemaError).toBe(message)
    const after = await t.stored()
    expect(after?.readAt).toEqual(before?.readAt)
    expect(after?.document).toEqual(before?.document)
  })

  it('SCH-10 leitura além do prazo é cancelada e vira falha', async () => {
    const t = await setup(100)
    t.neo4j.whenRead('db.schema.nodeTypeProperties', 'hang')

    await t.readOnce()

    const connection = await t.row()
    expect(connection?.schemaStatus).toBe('FAILED')
    expect(connection?.schemaError).toBe('A leitura do schema passou de 120 s')
    expect(await t.stored()).toBeUndefined()
  })

  it('SCH-10 prazo padrão da leitura é 120 s', async () => {
    const t = await setup()
    expect(t.app.get(SCHEMA_READ_TIMEOUT_MS)).toBe(120_000)
  })

  it('SCH-11 pedido durante leitura em andamento devolve o estado sem nova leitura', async () => {
    const t = await setup()
    t.neo4j.hold()

    const first = await t.refresh.start(t.connection.id)
    const second = await t.refresh.start(t.connection.id)

    expect(first.status).toBe('READING')
    expect(second.status).toBe('READING')
    t.neo4j.release()
    await t.refresh.whenSettled(t.connection.id)
    const nodeReads = t.neo4j.calls.filter((call) =>
      call.cypher?.includes('db.schema.nodeTypeProperties'),
    )
    expect(nodeReads).toHaveLength(1)
    expect((await t.row())?.schemaStatus).toBe('READY')
  })

  it('SCH-14 log da leitura tem conexão, duração, contagens e resultado sem exemplos', async () => {
    const t = await setup()
    const lines = schemaLogs()

    await t.readOnce()

    const [line] = lines()
    expect(line).toContain(`connection=${t.connection.id}`)
    expect(line).toMatch(/durationMs=\d+/)
    expect(line).toContain('labels=2')
    expect(line).toContain('relationshipTypes=1')
    expect(line).toContain('result=ok')
    expect(line).not.toContain('PED-0001')
    expect(line).not.toContain('ana@x.com')

    t.neo4j.whenRead(
      'db.schema.nodeTypeProperties',
      new Neo4jGatewayError('falhou'),
    )
    await t.readOnce()
    expect(lines().at(-1)).toContain('result=failed')
    expect(lines().at(-1)).not.toContain('falhou')
  })

  it('SCH-23 escolha sobrevive à atualização do schema', async () => {
    const t = await setup()
    await t.db.insert(schemaExampleOptOuts).values({
      connectionId: t.connection.id,
      elementKind: 'LABEL',
      elementName: 'Cliente',
      propertyName: 'email',
    })

    await t.readOnce()

    const rows = await t.db.select().from(schemaExampleOptOuts)
    expect(rows.map((r) => [r.elementName, r.propertyName])).toEqual([
      ['Cliente', 'email'],
    ])
  })

  it('SCH-25 propriedade nova chega com envio do exemplo ligado', async () => {
    const t = await setup()
    await t.readOnce()
    programSchema(t.neo4j, {
      ...initial,
      nodes: [
        {
          labels: ['Cliente'],
          properties: [
            { name: 'nome', types: ['String'] },
            { name: 'telefone', types: ['String'], example: '1199' },
          ],
        },
      ],
    })

    await t.readOnce()

    const rows = await t.db
      .select()
      .from(schemaExampleOptOuts)
      .where(eq(schemaExampleOptOuts.connectionId, t.connection.id))
    expect(rows).toEqual([])
    const document = (await t.stored())?.document as {
      labels: { properties: { name: string; example: string | null }[] }[]
    }
    expect(document.labels[0]?.properties).toContainEqual({
      name: 'telefone',
      types: ['String'],
      example: "'1199'",
    })
  })

  it('SCH-28 label removido sai do schema com as escolhas dele', async () => {
    const t = await setup()
    await t.db.insert(schemaExampleOptOuts).values([
      {
        connectionId: t.connection.id,
        elementKind: 'LABEL',
        elementName: 'Antigo',
        propertyName: 'x',
      },
      {
        connectionId: t.connection.id,
        elementKind: 'LABEL',
        elementName: 'Cliente',
        propertyName: 'apelido',
      },
      {
        connectionId: t.connection.id,
        elementKind: 'RELATIONSHIP',
        elementName: 'FEZ',
        propertyName: 'peso',
      },
      {
        connectionId: t.connection.id,
        elementKind: 'LABEL',
        elementName: 'Pedido',
        propertyName: 'codigo',
      },
    ])

    await t.readOnce()

    const rows = await t.db
      .select()
      .from(schemaExampleOptOuts)
      .where(
        and(
          eq(schemaExampleOptOuts.connectionId, t.connection.id),
          eq(schemaExampleOptOuts.elementKind, 'LABEL'),
        ),
      )
    expect(rows.map((r) => `${r.elementName}.${r.propertyName}`)).toEqual([
      'Pedido.codigo',
    ])
    const all = await t.db.select().from(schemaExampleOptOuts)
    expect(all).toHaveLength(1)
  })

  it('SCH-29 conexão excluída durante a leitura descarta o resultado', async () => {
    const t = await setup()
    const lines = schemaLogs()
    t.neo4j.hold()
    await t.refresh.start(t.connection.id)

    await t.db.delete(connections).where(eq(connections.id, t.connection.id))
    t.neo4j.release()
    await t.refresh.whenSettled(t.connection.id)

    expect(await t.db.select().from(connectionSchemas)).toEqual([])
    expect(lines().at(-1)).toContain('result=discarded')
  })
})
