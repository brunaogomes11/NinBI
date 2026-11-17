import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POSTGRES_DIALECT } from '../src/sources/dialects'
import { PgGateway } from '../src/sources/gateways/pg.gateway'
import {
  type SourceConnection,
  SourceGatewayError,
  SourceTimeoutError,
} from '../src/sources/source'
import { SqlSource } from '../src/sources/sql.source'

/** O PostgreSQL do compose de dev (`pnpm infra:up`), o mesmo do `harness.ts`. */
const ADMIN_URL = 'postgres://ninbi:ninbi@localhost:55432/postgres'
const FIXTURE = 'ninbi_sql_fixture'
const FIXTURE_URL = ADMIN_URL.replace(/\/postgres$/, `/${FIXTURE}`)

const conn: SourceConnection = {
  id: '00000000-0000-4000-8000-0000000000aa',
  name: 'Fixture',
  type: 'POSTGRES',
  uri: null,
  host: 'localhost',
  port: 55432,
  ssl: false,
  database: FIXTURE,
  username: 'ninbi',
  password: 'ninbi',
}

const SETUP = `
CREATE TABLE clientes (
  id integer PRIMARY KEY,
  nome text NOT NULL,
  cidade text,
  criado date,
  atualizado timestamp,
  instante timestamptz,
  saldo numeric(12, 2),
  enorme numeric(30, 5),
  grande bigint,
  ativo boolean,
  dados jsonb,
  uid uuid,
  arquivo bytea
);
CREATE TABLE pedidos (
  id integer PRIMARY KEY,
  cliente_id integer NOT NULL REFERENCES clientes (id),
  total numeric(10, 2)
);
CREATE VIEW clientes_ativos AS SELECT id, nome FROM clientes WHERE ativo;
CREATE SCHEMA vendas;
CREATE TABLE vendas.metas (
  id integer,
  ano integer,
  valor integer,
  PRIMARY KEY (id, ano)
);
CREATE TABLE vendas.ajustes (
  meta_id integer,
  meta_ano integer,
  FOREIGN KEY (meta_id, meta_ano) REFERENCES vendas.metas (id, ano)
);
INSERT INTO clientes VALUES
  (1, 'Ana', 'Recife', '2024-01-15', '2024-01-15 10:30:00', '2024-01-15 07:30:00-03',
   19.90, 12345678901234567890.12345, 9007199254740993, true, '{"a": 1}',
   '1b4e28ba-2fa1-11d2-883f-0016d3cca427', '\\x010203'),
  (2, 'Bia', 'Olinda', '2023-06-01', NULL, NULL, 5, NULL, 42, false, NULL, NULL, NULL),
  (3, 'Caio', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL);
INSERT INTO pedidos VALUES (10, 1, 100.50), (11, 2, 20);
INSERT INTO vendas.metas VALUES (1, 2024, 1000);
`

let admin: Pool
const gateway = new PgGateway()
const source = new SqlSource('POSTGRES', gateway, POSTGRES_DIALECT)
const opts = { timeoutMs: 30_000, maxRows: 5_001 }

async function dropFixture(): Promise<void> {
  await admin.query(`DROP DATABASE IF EXISTS ${FIXTURE} WITH (FORCE)`)
}

beforeAll(async () => {
  admin = new Pool({ connectionString: ADMIN_URL, max: 1 })
  admin.on('error', () => undefined)
  await dropFixture()
  await admin.query(`CREATE DATABASE ${FIXTURE}`)
  const fixture = new Pool({ connectionString: FIXTURE_URL, max: 1 })
  try {
    await fixture.query(SETUP)
  } finally {
    await fixture.end()
  }
})

afterAll(async () => {
  if (!admin) return
  await dropFixture()
  await admin.end()
})

describe('fonte PostgreSQL contra o PostgreSQL real', () => {
  it('SQX-28 filtro vazio devolve todas as linhas no PostgreSQL real', async () => {
    const query =
      'SELECT id FROM clientes WHERE ($ids IS NULL OR id IN ($ids)) ORDER BY id'

    const empty = await source.run(conn, query, { ids: null }, opts)
    expect(empty.rows).toEqual([[1], [2], [3]])
    const missing = await source.run(conn, query, {}, opts)
    expect(missing.rows).toEqual([[1], [2], [3]])

    const chosen = await source.run(conn, query, { ids: [1, 3] }, opts)
    expect(chosen.rows).toEqual([[1], [3]])
  })

  it('SQX-04 PostgreSQL real recusa escrita em transação de leitura', async () => {
    // Direto no gateway: o validador da fonte já barraria o INSERT antes.
    const error = await gateway
      .read(
        {
          host: 'localhost',
          port: 55432,
          database: FIXTURE,
          username: 'ninbi',
          password: 'ninbi',
          ssl: false,
        },
        "INSERT INTO clientes (id, nome) VALUES (99, 'Intrusa') RETURNING id",
        [],
        opts,
      )
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(SourceGatewayError)
    expect((error as SourceGatewayError).code).toBe('25006')
    expect((error as Error).message).toMatch(/read-only transaction/)
    const { rows } = await source.run(
      conn,
      'SELECT count(*) AS n FROM clientes',
      {},
      opts,
    )
    expect(rows).toEqual([[3]])
  })

  it('SCS-03 PostgreSQL real lista só schemas de usuário com views e chaves estrangeiras', async () => {
    const schema = await source.readSchema(conn, {
      deadline: Date.now() + 30_000,
      signal: new AbortController().signal,
    })

    const names = schema.tables.map((table) => table.name).sort()
    expect(names).toEqual([
      'public.clientes',
      'public.clientes_ativos',
      'public.pedidos',
      'vendas.ajustes',
      'vendas.metas',
    ])
    expect(
      schema.tables.every(
        (table) =>
          !/^(information_schema|pg_catalog|pg_toast)\./.test(table.name),
      ),
    ).toBe(true)
    const view = schema.tables.find(
      (table) => table.name === 'public.clientes_ativos',
    )
    expect(view?.isView).toBe(true)
    const clientes = schema.tables.find(
      (table) => table.name === 'public.clientes',
    )
    expect(clientes?.isView).toBe(false)
    expect(clientes?.columns.find((column) => column.name === 'nome')).toEqual({
      name: 'nome',
      type: 'text',
      example: "'Ana'",
    })
    expect(
      clientes?.columns.find((column) => column.name === 'saldo')?.type,
    ).toBe('numeric(12,2)')
    expect(schema.foreignKeys).toEqual(
      expect.arrayContaining([
        {
          from: { table: 'public.pedidos', columns: ['cliente_id'] },
          to: { table: 'public.clientes', columns: ['id'] },
        },
        {
          from: { table: 'vendas.ajustes', columns: ['meta_id', 'meta_ano'] },
          to: { table: 'vendas.metas', columns: ['id', 'ano'] },
        },
      ]),
    )
    expect(schema.foreignKeys).toHaveLength(2)
  })

  it('SQX-21 PostgreSQL real devolve os tipos da spec', async () => {
    const result = await source.run(
      conn,
      'SELECT id, nome, cidade, criado, atualizado, instante, saldo, enorme, grande, ativo, dados, uid, arquivo FROM clientes WHERE criado >= $desde ORDER BY id',
      { desde: { kind: 'date', value: '2024-01-01' } },
      opts,
    )

    expect(result.keys).toEqual([
      'id',
      'nome',
      'cidade',
      'criado',
      'atualizado',
      'instante',
      'saldo',
      'enorme',
      'grande',
      'ativo',
      'dados',
      'uid',
      'arquivo',
    ])
    expect(result.rows).toEqual([
      [
        1,
        'Ana',
        'Recife',
        '2024-01-15',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00Z',
        19.9,
        '12345678901234567890.12345',
        { kind: 'bigint', value: '9007199254740993' },
        true,
        { kind: 'json', value: '{"a":1}' },
        '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
        '<binário 3 bytes>',
      ],
    ])

    const others = await source.run(
      conn,
      'SELECT grande, saldo, atualizado, instante, nome AS x, cidade AS x FROM clientes WHERE id = $id',
      { id: 2 },
      opts,
    )
    expect(others.keys).toEqual([
      'grande',
      'saldo',
      'atualizado',
      'instante',
      'x',
      'x_2',
    ])
    expect(others.rows).toEqual([[42, 5, null, null, 'Bia', 'Olinda']])
  })

  it('SQX-10 PostgreSQL real cancela consulta lenta', async () => {
    const started = Date.now()

    await expect(
      source.run(conn, 'SELECT pg_sleep(5)', {}, { timeoutMs: 300 }),
    ).rejects.toBeInstanceOf(SourceTimeoutError)
    expect(Date.now() - started).toBeLessThan(3_000)

    // O banco cancelou a consulta: nenhuma `pg_sleep` segue rodando.
    let running = 1
    for (let i = 0; i < 30 && running > 0; i++) {
      const { rows } = await admin.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_stat_activity
         WHERE datname = $1 AND state = 'active' AND query LIKE 'SELECT pg_sleep%'`,
        [FIXTURE],
      )
      running = Number(rows[0]?.n)
      if (running > 0) await new Promise((resolve) => setTimeout(resolve, 100))
    }
    expect(running).toBe(0)
  })
})
