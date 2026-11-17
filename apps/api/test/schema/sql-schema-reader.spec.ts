import { describe, expect, it } from 'vitest'
import { validateReadOnlySql } from '../../src/queries/read-only-sql'
import { SqlSchemaReader } from '../../src/schema/sql-schema-reader'
import {
  MYSQL_DIALECT,
  POSTGRES_DIALECT,
  SQLSERVER_DIALECT,
  type SqlDialect,
} from '../../src/sources/dialects'
import { SourceTimeoutError } from '../../src/sources/source'
import { type FakeSqlConfig, FakeSqlGateway } from '../fakes/fake-sql.gateway'

const cfg: FakeSqlConfig = {
  host: 'db.local',
  port: 5432,
  database: 'loja',
  username: 'leitor',
  password: 'segredo',
  ssl: false,
}

const TABLE_KEYS = [
  'table_schema',
  'table_name',
  'is_view',
  'column_name',
  'data_type',
]
const FK_KEYS = [
  'constraint_name',
  'from_schema',
  'from_table',
  'from_column',
  'to_schema',
  'to_table',
  'to_column',
  'position',
]

function options(ms = 60_000) {
  return { deadline: Date.now() + ms, signal: new AbortController().signal }
}

function catalog(
  gateway: FakeSqlGateway,
  dialect: SqlDialect,
  tables: unknown[][],
  foreignKeys: unknown[][] = [],
) {
  gateway.whenRead(dialect.catalogQueries.tables, {
    keys: TABLE_KEYS,
    rows: tables,
  })
  gateway.whenRead(dialect.catalogQueries.foreignKeys, {
    keys: FK_KEYS,
    rows: foreignKeys,
  })
}

function sample(
  gateway: FakeSqlGateway,
  dialect: SqlDialect,
  schema: string,
  name: string,
  answer: Parameters<FakeSqlGateway['whenRead']>[1],
) {
  gateway.whenRead(dialect.sampleQuery({ schema, name }, 100), answer)
}

const read = (gateway: FakeSqlGateway, dialect: SqlDialect, ms?: number) =>
  new SqlSchemaReader().read(gateway, cfg, dialect, options(ms))

describe('SqlSchemaReader', () => {
  it('SCS-02 leitura guarda tabelas, views e colunas com o tipo', async () => {
    const gateway = new FakeSqlGateway()
    catalog(gateway, POSTGRES_DIALECT, [
      ['public', 'clientes', false, 'id', 'integer'],
      ['public', 'clientes', false, 'nome', 'character varying(80)'],
      ['public', 'vendas_mes', true, 'total', 'numeric(12,2)'],
    ])
    sample(gateway, POSTGRES_DIALECT, 'public', 'clientes', [])
    sample(gateway, POSTGRES_DIALECT, 'public', 'vendas_mes', [])

    expect(await read(gateway, POSTGRES_DIALECT)).toEqual({
      kind: 'RELATIONAL',
      tables: [
        {
          name: 'public.clientes',
          isView: false,
          columns: [
            { name: 'id', type: 'integer', example: null },
            { name: 'nome', type: 'character varying(80)', example: null },
          ],
        },
        {
          name: 'public.vendas_mes',
          isView: true,
          columns: [{ name: 'total', type: 'numeric(12,2)', example: null }],
        },
      ],
      foreignKeys: [],
    })

    const mysql = new FakeSqlGateway()
    catalog(mysql, MYSQL_DIALECT, [
      ['loja', 'clientes', 0, 'id', 'int'],
      ['loja', 'resumo', 1, 'qtd', 'bigint'],
    ])
    sample(mysql, MYSQL_DIALECT, 'loja', 'clientes', [])
    sample(mysql, MYSQL_DIALECT, 'loja', 'resumo', [])
    const tables = (await read(mysql, MYSQL_DIALECT)).tables
    expect(tables.map((t) => [t.name, t.isView])).toEqual([
      ['clientes', false],
      ['resumo', true],
    ])
  })

  it('SCS-04 exemplo é o primeiro valor não nulo das primeiras 100 linhas', async () => {
    const gateway = new FakeSqlGateway()
    catalog(gateway, POSTGRES_DIALECT, [
      ['public', 'pedidos', false, 'id', 'integer'],
      ['public', 'pedidos', false, 'nota', 'text'],
      ['public', 'pedidos', false, 'dia', 'date'],
      ['public', 'pedidos', false, 'tarde', 'text'],
    ])
    const long = `O'${'x'.repeat(3000)}`
    const rows: unknown[][] = [
      [null, null, null, null],
      [7, long, '2024-01-31', null],
      [8, 'outra', '2024-02-01', null],
    ]
    while (rows.length < 100) rows.push([9, 'z', '2024-03-01', null])
    rows.push([10, 'z', '2024-03-01', 'depois da linha 100'])
    sample(gateway, POSTGRES_DIALECT, 'public', 'pedidos', {
      keys: ['id', 'nota', 'dia', 'tarde'],
      rows,
    })

    const schema = await read(gateway, POSTGRES_DIALECT)
    expect(schema.tables[0]?.columns).toEqual([
      { name: 'id', type: 'integer', example: '7' },
      { name: 'nota', type: 'text', example: `'O''${'x'.repeat(3000)}'` },
      { name: 'dia', type: 'date', example: "'2024-01-31'" },
      { name: 'tarde', type: 'text', example: null },
    ])
    const sampleCall = gateway.calls.find((call) =>
      call.sql?.startsWith('SELECT * FROM "public"."pedidos"'),
    )
    expect(sampleCall?.sql).toBe('SELECT * FROM "public"."pedidos" LIMIT 100')
    expect(sampleCall?.opts?.maxRows).toBe(100)
  })

  it('SCS-05 chave estrangeira composta vira par de tabela e colunas', async () => {
    const gateway = new FakeSqlGateway()
    catalog(
      gateway,
      POSTGRES_DIALECT,
      [
        ['public', 'pedidos', false, 'id', 'integer'],
        ['public', 'pedidos', false, 'ano', 'integer'],
        ['public', 'itens', false, 'pedido_id', 'integer'],
        ['public', 'itens', false, 'pedido_ano', 'integer'],
        ['public', 'itens', false, 'produto_id', 'integer'],
        ['vendas', 'produtos', false, 'id', 'integer'],
      ],
      [
        [
          'fk_item_pedido',
          'public',
          'itens',
          'pedido_ano',
          'public',
          'pedidos',
          'ano',
          2,
        ],
        [
          'fk_item_pedido',
          'public',
          'itens',
          'pedido_id',
          'public',
          'pedidos',
          'id',
          1,
        ],
        [
          'fk_item_produto',
          'public',
          'itens',
          'produto_id',
          'vendas',
          'produtos',
          'id',
          1,
        ],
      ],
    )
    gateway.whenRead('LIMIT 100', [])

    expect((await read(gateway, POSTGRES_DIALECT)).foreignKeys).toEqual([
      {
        from: { table: 'public.itens', columns: ['pedido_id', 'pedido_ano'] },
        to: { table: 'public.pedidos', columns: ['id', 'ano'] },
      },
      {
        from: { table: 'public.itens', columns: ['produto_id'] },
        to: { table: 'vendas.produtos', columns: ['id'] },
      },
    ])
  })

  it('SCS-06 nome qualificado no PostgreSQL e no SQL Server e simples no MySQL', async () => {
    const cases: [SqlDialect, string, string, string][] = [
      [POSTGRES_DIALECT, 'vendas', 'vendas.pedidos', 'vendas.clientes'],
      [SQLSERVER_DIALECT, 'dbo', 'dbo.pedidos', 'dbo.clientes'],
      [MYSQL_DIALECT, 'loja', 'pedidos', 'clientes'],
    ]
    for (const [dialect, schemaName, pedidos, clientes] of cases) {
      const gateway = new FakeSqlGateway()
      catalog(
        gateway,
        dialect,
        [
          [schemaName, 'clientes', false, 'id', 'int'],
          [schemaName, 'pedidos', false, 'cliente_id', 'int'],
        ],
        [
          [
            'fk',
            schemaName,
            'pedidos',
            'cliente_id',
            schemaName,
            'clientes',
            'id',
            1,
          ],
        ],
      )
      sample(gateway, dialect, schemaName, 'clientes', [{ id: 1 }])
      sample(gateway, dialect, schemaName, 'pedidos', [{ cliente_id: 1 }])

      const schema = await read(gateway, dialect)
      expect(
        schema.tables.map((t) => t.name),
        dialect.label,
      ).toEqual([clientes, pedidos])
      expect(schema.foreignKeys, dialect.label).toEqual([
        {
          from: { table: pedidos, columns: ['cliente_id'] },
          to: { table: clientes, columns: ['id'] },
        },
      ])
      expect(schema.tables[0]?.columns[0]?.example, dialect.label).toBe('1')
    }
  })

  it('SCS-07 tabela sem permissão de leitura fica sem exemplo e a leitura conclui', async () => {
    const gateway = new FakeSqlGateway()
    catalog(gateway, POSTGRES_DIALECT, [
      ['public', 'segredos', false, 'senha', 'text'],
      ['public', 'clientes', false, 'nome', 'text'],
    ])
    sample(
      gateway,
      POSTGRES_DIALECT,
      'public',
      'segredos',
      new Error('permission denied for table segredos'),
    )
    sample(gateway, POSTGRES_DIALECT, 'public', 'clientes', [{ nome: 'Ana' }])

    expect((await read(gateway, POSTGRES_DIALECT)).tables).toEqual([
      {
        name: 'public.segredos',
        isView: false,
        columns: [{ name: 'senha', type: 'text', example: null }],
      },
      {
        name: 'public.clientes',
        isView: false,
        columns: [{ name: 'nome', type: 'text', example: "'Ana'" }],
      },
    ])
  })

  it('SCS-08 catálogo ilegível falha a leitura com a mensagem do banco', async () => {
    const tables = new FakeSqlGateway()
    tables.whenRead(
      POSTGRES_DIALECT.catalogQueries.tables,
      new Error('permission denied for schema vendas'),
    )
    await expect(read(tables, POSTGRES_DIALECT)).rejects.toThrow(
      'permission denied for schema vendas',
    )

    const keys = new FakeSqlGateway()
    catalog(keys, MYSQL_DIALECT, [['loja', 'clientes', 0, 'id', 'int']])
    keys.whenRead(
      MYSQL_DIALECT.catalogQueries.foreignKeys,
      new Error("SELECT command denied to user 'leitor'"),
    )
    await expect(read(keys, MYSQL_DIALECT)).rejects.toThrow(
      "SELECT command denied to user 'leitor'",
    )
  })

  it('SCS-09 a leitura do schema só usa gateway.read', async () => {
    for (const dialect of [
      POSTGRES_DIALECT,
      MYSQL_DIALECT,
      SQLSERVER_DIALECT,
    ]) {
      const gateway = new FakeSqlGateway()
      catalog(
        gateway,
        dialect,
        [
          ['s', 'a', false, 'id', 'int'],
          ['s', 'b', false, 'a_id', 'int'],
        ],
        [['fk', 's', 'b', 'a_id', 's', 'a', 'id', 1]],
      )
      sample(gateway, dialect, 's', 'a', [{ id: 1 }])
      sample(gateway, dialect, 's', 'b', [{ a_id: 1 }])
      await read(gateway, dialect)

      expect(gateway.calls.length, dialect.label).toBe(4)
      for (const call of gateway.calls) {
        expect(call.method, dialect.label).toBe('read')
        expect(call.values).toEqual([])
        expect(validateReadOnlySql(call.sql as string), call.sql).toEqual({
          ok: true,
        })
      }
    }
  })

  it('a leitura respeita o prazo e o signal', async () => {
    const late = new FakeSqlGateway()
    catalog(late, POSTGRES_DIALECT, [])
    await expect(
      new SqlSchemaReader().read(late, cfg, POSTGRES_DIALECT, {
        deadline: Date.now() - 1,
        signal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(SourceTimeoutError)
    expect(late.calls).toEqual([])

    const hanging = new FakeSqlGateway()
    catalog(hanging, POSTGRES_DIALECT, [['public', 'a', false, 'id', 'int']])
    sample(hanging, POSTGRES_DIALECT, 'public', 'a', 'hang')
    const abort = new AbortController()
    const reading = new SqlSchemaReader().read(hanging, cfg, POSTGRES_DIALECT, {
      deadline: Date.now() + 60_000,
      signal: abort.signal,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    abort.abort()
    await expect(reading).rejects.toBeInstanceOf(SourceTimeoutError)

    const slow = new FakeSqlGateway()
    catalog(slow, POSTGRES_DIALECT, [['public', 'a', false, 'id', 'int']])
    sample(slow, POSTGRES_DIALECT, 'public', 'a', 'hang')
    const call = read(slow, POSTGRES_DIALECT, 50)
    await expect(call).rejects.toBeInstanceOf(SourceTimeoutError)
    const timeouts = slow.calls.map((c) => c.opts?.timeoutMs ?? 0)
    expect(Math.max(...timeouts)).toBeLessThanOrEqual(50)
  })
})
