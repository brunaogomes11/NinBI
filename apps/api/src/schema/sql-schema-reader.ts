import { Neo4jTimeoutError } from '../neo4j/neo4j.gateway'
import type { SqlDialect, SqlTableRef } from '../sources/dialects'
import type { SchemaReadOptions } from './schema-reader'
import { toSqlLiteral } from './sql-literal'
import type {
  StoredForeignKey,
  StoredRelationalSchema,
  StoredTable,
} from './types'

/** Linhas por tabela lidas para achar o exemplo de cada coluna (SCS-04). */
export const SAMPLE_ROWS = 100

/**
 * O que o leitor usa do gateway SQL: só `read` (SCS-09).
 */
// SPEC_DEVIATION: `SqlGateway` e `SqlConnectionConfig` nascem na T16 em
// `sources/gateways/sql.gateway.ts`; até lá o leitor declara só a leitura que
// usa, e o `SqlGateway` da T16 a satisfaz pela forma.
export interface SqlSchemaGateway<Config> {
  read(
    cfg: Config,
    sql: string,
    values: unknown[],
    opts: { timeoutMs: number; maxRows?: number; signal?: AbortSignal },
  ): Promise<{ keys: string[]; rows: unknown[][] }>
}

interface CatalogTable {
  ref: SqlTableRef
  table: StoredTable
}

type Row = (column: string) => unknown

function rowReader(keys: string[]): (row: unknown[]) => Row {
  const index = new Map(keys.map((key, i) => [key.toLowerCase(), i]))
  return (row) => (column) => {
    const i = index.get(column)
    return i === undefined ? undefined : row[i]
  }
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** `is_view` chega como booleano, `1`/`0` ou texto, conforme o driver. */
function isTrue(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 't'
}

/**
 * Lê tabelas, views, colunas com o tipo, chaves estrangeiras e um exemplo
 * por coluna de um banco SQL, só por `gateway.read` (SCS-02 a SCS-09).
 */
export class SqlSchemaReader {
  async read<Config>(
    gateway: SqlSchemaGateway<Config>,
    cfg: Config,
    dialect: SqlDialect,
    options: SchemaReadOptions,
  ): Promise<StoredRelationalSchema> {
    const expired = () =>
      options.signal.aborted || options.deadline - Date.now() <= 0
    const query = (sql: string, maxRows?: number) => {
      const timeoutMs = options.deadline - Date.now()
      // SPEC_DEVIATION: `SourceTimeoutError` nasce na T13 (e o
      // `Neo4jTimeoutError` passa a estendê-lo); até lá o prazo usa o erro que
      // o refresh do schema já reconhece como estouro.
      if (timeoutMs <= 0 || options.signal.aborted) {
        throw new Neo4jTimeoutError('O banco não respondeu no prazo')
      }
      return gateway.read(cfg, sql, [], {
        timeoutMs,
        maxRows,
        signal: options.signal,
      })
    }
    const nameOf = (ref: SqlTableRef) =>
      dialect.qualifiedNames ? `${ref.schema}.${ref.name}` : ref.name

    const catalog = await query(dialect.catalogQueries.tables)
    const tables = new Map<string, CatalogTable>()
    const readTableRow = rowReader(catalog.keys)
    for (const raw of catalog.rows) {
      const row = readTableRow(raw)
      const ref = {
        schema: text(row('table_schema')),
        name: text(row('table_name')),
      }
      const name = nameOf(ref)
      let entry = tables.get(name)
      if (!entry) {
        entry = {
          ref,
          table: { name, isView: isTrue(row('is_view')), columns: [] },
        }
        tables.set(name, entry)
      }
      entry.table.columns.push({
        name: text(row('column_name')),
        type: text(row('data_type')),
        example: null,
      })
    }

    const keysResult = await query(dialect.catalogQueries.foreignKeys)
    const readKeyRow = rowReader(keysResult.keys)
    const grouped = new Map<
      string,
      { key: StoredForeignKey; pairs: [number, string, string][] }
    >()
    for (const raw of keysResult.rows) {
      const row = readKeyRow(raw)
      const from = nameOf({
        schema: text(row('from_schema')),
        name: text(row('from_table')),
      })
      const id = JSON.stringify([from, text(row('constraint_name'))])
      let group = grouped.get(id)
      if (!group) {
        const to = nameOf({
          schema: text(row('to_schema')),
          name: text(row('to_table')),
        })
        group = {
          key: {
            from: { table: from, columns: [] },
            to: { table: to, columns: [] },
          },
          pairs: [],
        }
        grouped.set(id, group)
      }
      group.pairs.push([
        Number(row('position')),
        text(row('from_column')),
        text(row('to_column')),
      ])
    }
    const foreignKeys = [...grouped.values()].map(({ key, pairs }) => {
      pairs.sort((a, b) => a[0] - b[0])
      key.from.columns = pairs.map((pair) => pair[1])
      key.to.columns = pairs.map((pair) => pair[2])
      return key
    })

    for (const { ref, table } of tables.values()) {
      let sample: { keys: string[]; rows: unknown[][] }
      try {
        sample = await query(dialect.sampleQuery(ref, SAMPLE_ROWS), SAMPLE_ROWS)
      } catch (error) {
        // Sem permissão de ler a tabela: ela fica sem exemplos (SCS-07); o prazo não.
        if (error instanceof Neo4jTimeoutError || expired()) throw error
        continue
      }
      for (const column of table.columns) {
        const i = sample.keys.indexOf(column.name)
        if (i === -1) continue
        for (const row of sample.rows.slice(0, SAMPLE_ROWS)) {
          const literal = toSqlLiteral(row[i])
          if (literal !== null) {
            column.example = literal
            break
          }
        }
      }
    }

    return {
      kind: 'RELATIONAL',
      tables: [...tables.values()].map((entry) => entry.table),
      foreignKeys,
    }
  }
}
