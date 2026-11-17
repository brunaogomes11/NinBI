import type { SqlDialect } from '../../src/sources/dialects'
import type { FakeSqlGateway } from './fake-sql.gateway'

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

export interface SqlFixtureTable {
  schema: string
  name: string
  isView?: boolean
  /** `[coluna, tipo]`, na ordem da tabela. */
  columns: [string, string][]
  /** Linhas de exemplo, como objetos; sem a chave, a tabela não tem linhas. */
  rows?: Record<string, unknown>[]
}

export interface SqlFixtureForeignKey {
  name: string
  from: { schema: string; table: string; columns: string[] }
  to: { schema: string; table: string; columns: string[] }
}

/** Programa no gateway falso o catálogo e os exemplos que o `SqlSchemaReader` lê. */
export function programSqlSchema(
  gateway: FakeSqlGateway,
  dialect: SqlDialect,
  tables: SqlFixtureTable[],
  foreignKeys: SqlFixtureForeignKey[] = [],
): void {
  gateway.whenRead(dialect.catalogQueries.tables, {
    keys: TABLE_KEYS,
    rows: tables.flatMap((table) =>
      table.columns.map(([column, type]) => [
        table.schema,
        table.name,
        table.isView ?? false,
        column,
        type,
      ]),
    ),
  })
  gateway.whenRead(dialect.catalogQueries.foreignKeys, {
    keys: FK_KEYS,
    rows: foreignKeys.flatMap((fk) =>
      fk.from.columns.map((column, i) => [
        fk.name,
        fk.from.schema,
        fk.from.table,
        column,
        fk.to.schema,
        fk.to.table,
        fk.to.columns[i],
        i + 1,
      ]),
    ),
  })
  for (const table of tables) {
    gateway.whenRead(
      dialect.sampleQuery({ schema: table.schema, name: table.name }, 100),
      {
        keys: table.columns.map(([column]) => column),
        rows: (table.rows ?? []).map((row) =>
          table.columns.map(([column]) => row[column] ?? null),
        ),
      },
    )
  }
}
