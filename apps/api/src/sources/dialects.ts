import { SQL_DEFAULT_PORTS } from '@ninbi/contracts'

export type SqlConnectionType = keyof typeof SQL_DEFAULT_PORTS

/** Tabela do catálogo: o schema e o nome, sem aspas. */
export interface SqlTableRef {
  schema: string
  name: string
}

/**
 * Como cada banco SQL é falado. As consultas de catálogo devolvem colunas com
 * estes nomes (em minúsculas):
 * - `tables`: `table_schema`, `table_name`, `is_view`, `column_name`,
 *   `data_type`, uma linha por coluna, na ordem das colunas da tabela;
 * - `foreignKeys`: `constraint_name`, `from_schema`, `from_table`,
 *   `from_column`, `to_schema`, `to_table`, `to_column`, `position`, uma linha
 *   por coluna da chave, na ordem da chave.
 */
export interface SqlDialect {
  type: SqlConnectionType
  placeholder: 'dollar' | 'question' | 'at'
  quote(identifier: string): string
  sampleQuery(table: SqlTableRef, n: number): string
  catalogQueries: { tables: string; foreignKeys: string }
  /** As tabelas se chamam `schema.tabela` (SCS-06). */
  qualifiedNames: boolean
  syntaxErrorCodes: ReadonlySet<string>
  label: 'PostgreSQL' | 'MySQL' | 'T-SQL'
  defaultPort: number
}

/** Schemas do sistema que nenhuma consulta de catálogo lê (SCS-03). */
export const SYSTEM_SCHEMAS = [
  'information_schema',
  'pg_catalog',
  'pg_toast',
  'sys',
  'INFORMATION_SCHEMA',
  'mysql',
  'performance_schema',
] as const

const SYSTEM_SCHEMA_LIST = SYSTEM_SCHEMAS.map((name) => `'${name}'`).join(', ')

function rowCount(n: number): number {
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new RangeError(`Número de linhas inválido: ${n}`)
  }
  return n
}

const POSTGRES_TABLES = `SELECT n.nspname AS table_schema,
  c.relname AS table_name,
  c.relkind IN ('v', 'm') AS is_view,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND NOT c.relispartition
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname NOT IN (${SYSTEM_SCHEMA_LIST})
  AND n.nspname NOT LIKE 'pg\\_temp\\_%'
  AND n.nspname NOT LIKE 'pg\\_toast\\_temp\\_%'
ORDER BY n.nspname, c.relname, a.attnum`

const POSTGRES_FOREIGN_KEYS = `SELECT con.conname AS constraint_name,
  fn.nspname AS from_schema,
  fc.relname AS from_table,
  fa.attname AS from_column,
  tn.nspname AS to_schema,
  tc.relname AS to_table,
  ta.attname AS to_column,
  k.ord AS position
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class fc ON fc.oid = con.conrelid
JOIN pg_catalog.pg_namespace fn ON fn.oid = fc.relnamespace
JOIN pg_catalog.pg_class tc ON tc.oid = con.confrelid
JOIN pg_catalog.pg_namespace tn ON tn.oid = tc.relnamespace
CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(from_attnum, to_attnum, ord)
JOIN pg_catalog.pg_attribute fa ON fa.attrelid = con.conrelid AND fa.attnum = k.from_attnum
JOIN pg_catalog.pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = k.to_attnum
WHERE con.contype = 'f'
  AND fn.nspname NOT IN (${SYSTEM_SCHEMA_LIST})
  AND tn.nspname NOT IN (${SYSTEM_SCHEMA_LIST})
ORDER BY fn.nspname, fc.relname, con.conname, k.ord`

const MYSQL_TABLES = `SELECT c.TABLE_SCHEMA AS table_schema,
  c.TABLE_NAME AS table_name,
  t.TABLE_TYPE = 'VIEW' AS is_view,
  c.COLUMN_NAME AS column_name,
  c.COLUMN_TYPE AS data_type
FROM INFORMATION_SCHEMA.COLUMNS c
JOIN INFORMATION_SCHEMA.TABLES t
  ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
WHERE c.TABLE_SCHEMA = DATABASE()
  AND c.TABLE_SCHEMA NOT IN (${SYSTEM_SCHEMA_LIST})
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`

const MYSQL_FOREIGN_KEYS = `SELECT k.CONSTRAINT_NAME AS constraint_name,
  k.TABLE_SCHEMA AS from_schema,
  k.TABLE_NAME AS from_table,
  k.COLUMN_NAME AS from_column,
  k.REFERENCED_TABLE_SCHEMA AS to_schema,
  k.REFERENCED_TABLE_NAME AS to_table,
  k.REFERENCED_COLUMN_NAME AS to_column,
  k.ORDINAL_POSITION AS position
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
WHERE k.REFERENCED_TABLE_NAME IS NOT NULL
  AND k.TABLE_SCHEMA = DATABASE()
  AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
  AND k.TABLE_SCHEMA NOT IN (${SYSTEM_SCHEMA_LIST})
ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`

const SQLSERVER_TABLES = `SELECT c.TABLE_SCHEMA AS table_schema,
  c.TABLE_NAME AS table_name,
  CAST(CASE WHEN t.TABLE_TYPE = 'VIEW' THEN 1 ELSE 0 END AS bit) AS is_view,
  c.COLUMN_NAME AS column_name,
  c.DATA_TYPE + CASE
    WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN '(max)'
    WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL
      THEN '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS varchar(10)) + ')'
    WHEN c.DATA_TYPE IN ('decimal', 'numeric')
      THEN '(' + CAST(c.NUMERIC_PRECISION AS varchar(10)) + ','
        + CAST(c.NUMERIC_SCALE AS varchar(10)) + ')'
    ELSE ''
  END AS data_type
FROM INFORMATION_SCHEMA.COLUMNS c
JOIN INFORMATION_SCHEMA.TABLES t
  ON t.TABLE_CATALOG = c.TABLE_CATALOG
  AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
  AND t.TABLE_NAME = c.TABLE_NAME
WHERE c.TABLE_SCHEMA NOT IN (${SYSTEM_SCHEMA_LIST})
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`

const SQLSERVER_FOREIGN_KEYS = `SELECT fk.name AS constraint_name,
  fs.name AS from_schema,
  ft.name AS from_table,
  fc.name AS from_column,
  ts.name AS to_schema,
  tt.name AS to_table,
  tc.name AS to_column,
  fkc.constraint_column_id AS position
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables ft ON ft.object_id = fkc.parent_object_id
JOIN sys.schemas fs ON fs.schema_id = ft.schema_id
JOIN sys.columns fc
  ON fc.object_id = fkc.parent_object_id AND fc.column_id = fkc.parent_column_id
JOIN sys.tables tt ON tt.object_id = fkc.referenced_object_id
JOIN sys.schemas ts ON ts.schema_id = tt.schema_id
JOIN sys.columns tc
  ON tc.object_id = fkc.referenced_object_id AND tc.column_id = fkc.referenced_column_id
WHERE fs.name NOT IN (${SYSTEM_SCHEMA_LIST})
  AND ts.name NOT IN (${SYSTEM_SCHEMA_LIST})
ORDER BY fs.name, ft.name, fk.name, fkc.constraint_column_id`

function quoteWith(open: string, close: string) {
  return (identifier: string) =>
    `${open}${identifier.replaceAll(close, close + close)}${close}`
}

const quoteDouble = quoteWith('"', '"')
const quoteBacktick = quoteWith('`', '`')
const quoteBracket = quoteWith('[', ']')

export const POSTGRES_DIALECT: SqlDialect = {
  type: 'POSTGRES',
  placeholder: 'dollar',
  quote: quoteDouble,
  sampleQuery: (table, n) =>
    `SELECT * FROM ${quoteDouble(table.schema)}.${quoteDouble(table.name)} LIMIT ${rowCount(n)}`,
  catalogQueries: {
    tables: POSTGRES_TABLES,
    foreignKeys: POSTGRES_FOREIGN_KEYS,
  },
  qualifiedNames: true,
  syntaxErrorCodes: new Set(['42601', '42703', '42P01']),
  label: 'PostgreSQL',
  defaultPort: SQL_DEFAULT_PORTS.POSTGRES,
}

export const MYSQL_DIALECT: SqlDialect = {
  type: 'MYSQL',
  placeholder: 'question',
  quote: quoteBacktick,
  sampleQuery: (table, n) =>
    `SELECT * FROM ${quoteBacktick(table.name)} LIMIT ${rowCount(n)}`,
  catalogQueries: { tables: MYSQL_TABLES, foreignKeys: MYSQL_FOREIGN_KEYS },
  qualifiedNames: false,
  syntaxErrorCodes: new Set(['1064', '1054', '1146']),
  label: 'MySQL',
  defaultPort: SQL_DEFAULT_PORTS.MYSQL,
}

export const SQLSERVER_DIALECT: SqlDialect = {
  type: 'SQLSERVER',
  placeholder: 'at',
  quote: quoteBracket,
  sampleQuery: (table, n) =>
    `SELECT TOP ${rowCount(n)} * FROM ${quoteBracket(table.schema)}.${quoteBracket(table.name)}`,
  catalogQueries: {
    tables: SQLSERVER_TABLES,
    foreignKeys: SQLSERVER_FOREIGN_KEYS,
  },
  qualifiedNames: true,
  syntaxErrorCodes: new Set(['102', '207', '208']),
  label: 'T-SQL',
  defaultPort: SQL_DEFAULT_PORTS.SQLSERVER,
}

export const SQL_DIALECTS: Record<SqlConnectionType, SqlDialect> = {
  POSTGRES: POSTGRES_DIALECT,
  MYSQL: MYSQL_DIALECT,
  SQLSERVER: SQLSERVER_DIALECT,
}
