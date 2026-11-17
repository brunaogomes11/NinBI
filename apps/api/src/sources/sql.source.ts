import { extractParameterNames } from '@ninbi/contracts'
import { type QueryCheck, validateReadOnlySql } from '../queries/read-only-sql'
import { bindSqlParams } from '../queries/sql-params'
import { uniqueColumnNames } from '../queries/sql-result-value'
import type { SchemaReadOptions } from '../schema/schema-reader'
import { SqlSchemaReader } from '../schema/sql-schema-reader'
import type { StoredRelationalSchema } from '../schema/types'
import type { SqlConnectionType, SqlDialect } from './dialects'
import {
  isNetworkErrorCode,
  type SqlConnectionConfig,
  SqlDateParam,
  type SqlGateway,
} from './gateways/sql.gateway'
import {
  type PromptDialect,
  type Source,
  type SourceConnection,
  SourceGatewayError,
  type SourceReadOptions,
  type SourceResult,
  SourceUnavailableError,
} from './source'

function isWireDate(value: unknown): value is { kind: 'date'; value: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'date' &&
    typeof (value as { value?: unknown }).value === 'string'
  )
}

function dateParam(value: unknown): unknown {
  if (isWireDate(value)) return new SqlDateParam(value.value)
  if (Array.isArray(value)) return value.map(dateParam)
  return value
}

/** Erro de rede do driver vira indisponibilidade (SQX-26); o resto segue igual. */
function markUnavailable(error: unknown): unknown {
  if (
    error instanceof SourceGatewayError &&
    !(error instanceof SourceUnavailableError) &&
    isNetworkErrorCode(error.code)
  ) {
    return new SourceUnavailableError(error.message, error.code)
  }
  return error
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    throw markUnavailable(error)
  }
}

/** A fonte dos três bancos SQL, configurada por um gateway e um dialeto. */
export class SqlSource implements Source {
  readonly language = 'SQL' as const
  readonly dialect: PromptDialect
  private readonly schemaReader = new SqlSchemaReader()

  constructor(
    readonly type: SqlConnectionType,
    private readonly gateway: SqlGateway,
    readonly sqlDialect: SqlDialect,
  ) {
    this.dialect = sqlDialect.label
  }

  verify(conn: SourceConnection, opts: { timeoutMs: number }): Promise<void> {
    return guarded(() => this.gateway.verify(this.config(conn), opts))
  }

  validate(query: string): QueryCheck {
    return validateReadOnlySql(query)
  }

  parameterNames(query: string): string[] {
    return extractParameterNames(query, 'SQL')
  }

  /** O valor de `$nome` vai ao driver como parâmetro, nunca colado no texto (SQX-15). */
  async run(
    conn: SourceConnection,
    query: string,
    params: Record<string, unknown>,
    opts: SourceReadOptions,
  ): Promise<SourceResult> {
    // SPEC_DEVIATION: a data do fio vira `SqlDateParam` antes do `bindSqlParams`
    // (que, sozinho, a reduziria a texto) para que o gateway do SQL Server a
    // envie como `sql.Date` (SQX-20); os outros gateways a enviam como o texto.
    const wired = Object.fromEntries(
      Object.entries(params).map(([name, value]) => [name, dateParam(value)]),
    )
    const bound = bindSqlParams(query, wired, this.sqlDialect.placeholder)
    const cfg = this.config(conn)
    const result = await guarded(() =>
      this.gateway.read(cfg, bound.text, bound.values, opts),
    )
    return { keys: uniqueColumnNames(result.keys), rows: result.rows }
  }

  readSchema(
    conn: SourceConnection,
    opts: SchemaReadOptions,
  ): Promise<StoredRelationalSchema> {
    const cfg = this.config(conn)
    return guarded(() =>
      this.schemaReader.read(this.gateway, cfg, this.sqlDialect, opts),
    )
  }

  private config(conn: SourceConnection): SqlConnectionConfig {
    if (conn.host === null || conn.port === null || conn.database === null) {
      throw new SourceGatewayError(
        `A conexão ${conn.name} não tem host, porta e banco`,
      )
    }
    return {
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password,
      ssl: conn.ssl,
    }
  }
}
