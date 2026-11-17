import { Logger } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import {
  connectionSchemas,
  connections,
  schemaExampleOptOuts,
} from '../../src/database/schema'
import {
  DEFAULT_SCHEMA_READ_TIMEOUT_MS,
  SCHEMA_READ_TIMEOUT_MS,
  SchemaRefreshService,
} from '../../src/schema/schema-refresh.service'
import { POSTGRES_DIALECT } from '../../src/sources/dialects'
import { SourceGatewayError } from '../../src/sources/source'
import { createConnection } from '../factories'
import {
  programSqlSchema,
  type SqlFixtureForeignKey,
  type SqlFixtureTable,
} from '../fakes/sql-schema-fixture'
import { createTestApp } from '../harness'

const tables: SqlFixtureTable[] = [
  {
    schema: 'public',
    name: 'clientes',
    columns: [
      ['id', 'integer'],
      ['email', 'text'],
    ],
    rows: [{ id: 1, email: 'ana@segredo.com' }],
  },
  {
    schema: 'public',
    name: 'pedidos',
    columns: [
      ['id', 'integer'],
      ['cliente_id', 'integer'],
    ],
    rows: [{ id: 10, cliente_id: 1 }],
  },
]

const foreignKeys: SqlFixtureForeignKey[] = [
  {
    name: 'pedidos_cliente_fk',
    from: { schema: 'public', table: 'pedidos', columns: ['cliente_id'] },
    to: { schema: 'public', table: 'clientes', columns: ['id'] },
  },
]

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
  const pg = test.sql.POSTGRES
  programSqlSchema(pg, POSTGRES_DIALECT, tables, foreignKeys)
  const refresh = test.app.get(SchemaRefreshService)
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
    { name: 'Sortify', type: 'POSTGRES' },
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
  const catalogReads = () =>
    pg.reads.filter((sql) => sql === POSTGRES_DIALECT.catalogQueries.tables)
  return {
    ...test,
    pg,
    refresh,
    connection,
    stored,
    row,
    readOnce,
    catalogReads,
  }
}

function schemaLogs() {
  const spy = vi.spyOn(Logger.prototype, 'log')
  return () =>
    spy.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.startsWith('schema read'))
}

describe('leitura do schema SQL', () => {
  it('SCS-10 leitura grava no lugar do schema anterior e falha ou 120 s o mantém', async () => {
    // O prazo real é 120 s; o teste o encurta só para não esperar.
    expect(DEFAULT_SCHEMA_READ_TIMEOUT_MS).toBe(120_000)
    const t = await setup(500)
    await t.readOnce()
    const first = await t.stored()
    expect(first?.readAt).toEqual(t.clock.now())
    expect((await t.row())?.schemaStatus).toBe('READY')
    expect(first?.document).toMatchObject({
      kind: 'RELATIONAL',
      tables: [{ name: 'public.clientes' }, { name: 'public.pedidos' }],
      foreignKeys: [
        {
          from: { table: 'public.pedidos', columns: ['cliente_id'] },
          to: { table: 'public.clientes', columns: ['id'] },
        },
      ],
    })

    t.clock.advance(60_000)
    programSqlSchema(t.pg, POSTGRES_DIALECT, [
      { schema: 'public', name: 'lojas', columns: [['cidade', 'text']] },
    ])
    await t.readOnce()
    const second = await t.stored()
    expect(second?.readAt).toEqual(t.clock.now())
    const document = second?.document as { tables: { name: string }[] }
    expect(document.tables.map((table) => table.name)).toEqual(['public.lojas'])

    // Falha: o anterior fica, com a mensagem do banco.
    t.clock.advance(60_000)
    const message = 'permission denied for schema public'
    t.pg.whenRead(
      POSTGRES_DIALECT.catalogQueries.tables,
      new SourceGatewayError(message, '42501'),
    )
    await t.readOnce()
    expect(await t.row()).toMatchObject({
      schemaStatus: 'FAILED',
      schemaError: message,
    })
    expect(await t.stored()).toEqual(second)

    // Prazo: o anterior fica, com a mensagem de prazo.
    t.pg.whenRead(POSTGRES_DIALECT.catalogQueries.tables, 'hang')
    await t.readOnce()
    expect(await t.row()).toMatchObject({
      schemaStatus: 'FAILED',
      schemaError: 'A leitura do schema passou de 120 s',
    })
    expect(await t.stored()).toEqual(second)
  })

  it('SCS-11 leitura em andamento não inicia outra', async () => {
    const t = await setup()
    t.pg.whenRead(POSTGRES_DIALECT.catalogQueries.tables, 'hang')

    const first = await t.refresh.start(t.connection.id)
    const second = await t.refresh.start(t.connection.id)
    expect(first.status).toBe('READING')
    expect(second.status).toBe('READING')

    await vi.waitFor(() => expect(t.catalogReads()).toHaveLength(1))
    t.pg.release()
    await t.refresh.whenSettled(t.connection.id)
    expect(t.catalogReads()).toHaveLength(1)
    expect((await t.row())?.schemaStatus).toBe('READY')
  })

  it('SCS-16 escolha de exemplo por coluna sobrevive à atualização', async () => {
    const t = await setup()
    await t.readOnce()
    const optOut = (elementName: string, propertyName: string) => ({
      connectionId: t.connection.id,
      elementKind: 'TABLE' as const,
      elementName,
      propertyName,
    })
    await t.db
      .insert(schemaExampleOptOuts)
      .values([
        optOut('public.clientes', 'email'),
        optOut('public.clientes', 'telefone'),
        optOut('public.antiga', 'id'),
      ])

    await t.readOnce()

    const rows = await t.db
      .select()
      .from(schemaExampleOptOuts)
      .where(eq(schemaExampleOptOuts.connectionId, t.connection.id))
    expect(
      rows.map((r) => `${r.elementKind} ${r.elementName}.${r.propertyName}`),
    ).toEqual(['TABLE public.clientes.email'])
  })

  it('SCS-17 log da leitura SQL traz tipo, tabelas e relações sem exemplos', async () => {
    const t = await setup()
    const lines = schemaLogs()
    await t.readOnce()

    const [line] = lines()
    expect(line).toContain(`connection=${t.connection.id}`)
    expect(line).toContain('type=POSTGRES')
    expect(line).toMatch(/durationMs=\d+/)
    expect(line).toContain('tables=2')
    expect(line).toContain('foreignKeys=1')
    expect(line).toContain('result=ok')
    expect(line).not.toContain('ana@segredo.com')
    expect(line).not.toContain('clientes')

    t.pg.whenRead(
      POSTGRES_DIALECT.catalogQueries.tables,
      new SourceGatewayError('falhou com segredo'),
    )
    await t.readOnce()
    expect(lines().at(-1)).toContain('type=POSTGRES')
    expect(lines().at(-1)).toContain('result=failed')
    expect(lines().at(-1)).not.toContain('segredo')
  })

  it('SCS-18 conexão excluída durante a leitura descarta o resultado', async () => {
    const t = await setup()
    const lines = schemaLogs()
    t.pg.whenRead(POSTGRES_DIALECT.catalogQueries.tables, 'hang')
    await t.refresh.start(t.connection.id)
    await vi.waitFor(() => expect(t.catalogReads()).toHaveLength(1))

    await t.db.delete(connections).where(eq(connections.id, t.connection.id))
    t.pg.release()
    await t.refresh.whenSettled(t.connection.id)

    expect(await t.db.select().from(connectionSchemas)).toEqual([])
    expect(lines().at(-1)).toContain('result=discarded')
  })
})
