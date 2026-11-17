import type { Readable } from 'node:stream'
import {
  type ConnectionOptions,
  createConnection,
  type FieldPacket,
  type TypeCast,
} from 'mysql2'
import { toSqlResultValue } from '../../queries/sql-result-value'
import {
  SourceGatewayError,
  type SourceReadOptions,
  type SourceResult,
} from '../source'
import { runWithDeadline } from './run-with-deadline'
import {
  plainSqlValue,
  type SqlConnectionConfig,
  type SqlGateway,
} from './sql.gateway'

/** Margem dos prazos do driver sobre o prazo da operação: o temporizador do gateway decide. */
const DRIVER_TIMEOUT_MARGIN_MS = 5_000
/** Linhas guardadas no fluxo antes de pausar a leitura do socket. */
const STREAM_HIGH_WATER_MARK = 500
/** `ER_QUERY_TIMEOUT`: o `max_execution_time` venceu do lado do banco. */
const MYSQL_QUERY_TIMEOUT = 3024

const DATE_TIME = /^\d{4,}-\d\d-\d\d \d/

/** `2024-01-15 10:30:00` vira `2024-01-15T10:30:00` (sem fuso, como gravada). */
function isoLocal(text: string): string {
  return DATE_TIME.test(text) ? text.replace(' ', 'T') : text
}

/** `TIMESTAMP` lido na sessão em `+00:00` vira ISO 8601 em UTC. */
function isoUtc(text: string): string {
  return DATE_TIME.test(text) ? `${text.replace(' ', 'T')}Z` : text
}

/**
 * Data e hora como texto (`DATE` em `AAAA-MM-DD`, `DATETIME` em ISO sem `Z`,
 * `TIMESTAMP` em ISO em UTC), `BIGINT` como `bigint` e `DECIMAL` como número
 * exato ou texto (SQX-21, SQX-22). Usa só `next()`, que serve aos dois
 * protocolos do `mysql2`.
 */
export const mysqlTypeCast: TypeCast = (field, next) => {
  const value = next()
  if (value === null || value === undefined) return value
  switch (field.type) {
    case 'DATE':
    case 'NEWDATE':
      return String(value)
    case 'DATETIME':
      return isoLocal(String(value))
    case 'TIMESTAMP':
      return isoUtc(String(value))
    case 'LONGLONG':
      return typeof value === 'string' && /^-?\d+$/.test(value)
        ? BigInt(value)
        : value
    case 'DECIMAL':
    case 'NEWDECIMAL':
      return toSqlResultValue(String(value), { decimal: true })
    default:
      return value
  }
}

/**
 * Opções da conexão do `mysql2` (função pura): SSL com validação do
 * certificado ou sem SSL (SRC-12, SRC-13), datas como texto e números grandes
 * como texto antes do `typeCast`.
 */
export function mysqlConnectionOptions(
  cfg: SqlConnectionConfig,
  timeoutMs: number,
): ConnectionOptions {
  return {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.username,
    password: cfg.password,
    ...(cfg.ssl ? { ssl: { rejectUnauthorized: true } } : {}),
    connectTimeout: timeoutMs + DRIVER_TIMEOUT_MARGIN_MS,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    decimalNumbers: false,
    multipleStatements: false,
    typeCast: mysqlTypeCast,
  }
}

export interface MysqlRows {
  /** Os nomes das colunas, conhecidos antes da primeira linha. */
  fields(): string[]
  rows: AsyncIterable<unknown[]>
}

/** O que o gateway usa de uma conexão do MySQL. */
export interface MysqlConnection {
  connect(): Promise<void>
  query(sql: string): Promise<void>
  /** Consulta preparada com `?`, lida em fluxo, uma lista por linha. */
  stream(sql: string, values: unknown[]): MysqlRows
  end(): Promise<void>
  destroy(): void
}

export type MysqlConnectionFactory = (
  options: ConnectionOptions,
) => MysqlConnection

/** Conexão real do `mysql2`. */
export const createMysqlConnection: MysqlConnectionFactory = (options) => {
  const connection = createConnection(options)
  // Sem listener, a queda da conexão vira exceção não tratada no processo.
  connection.on('error', () => undefined)
  return {
    connect: () =>
      new Promise((resolve, reject) => {
        connection.connect((error) => (error ? reject(error) : resolve()))
      }),
    query: (sql) =>
      new Promise((resolve, reject) => {
        connection.query(sql, (error) => (error ? reject(error) : resolve()))
      }),
    stream: (sql, values) => {
      let fields: string[] = []
      const command = connection.execute({ sql, values, rowsAsArray: true })
      command.on('fields', (packets: FieldPacket[]) => {
        fields = packets.map((packet) => packet.name)
      })
      const rows: Readable = command.stream({
        highWaterMark: STREAM_HIGH_WATER_MARK,
      })
      return { fields: () => fields, rows }
    },
    end: () =>
      new Promise((resolve) => {
        connection.end(() => resolve())
      }),
    destroy: () => connection.destroy(),
  }
}

function isQueryTimeout(error: unknown): boolean {
  return (error as { errno?: unknown } | null)?.errno === MYSQL_QUERY_TIMEOUT
}

/** O código do MySQL é o número do erro (`1064`); o de rede segue (`ECONNRESET`). */
function errorCode(error: unknown): string | undefined {
  const { code, errno } = (error ?? {}) as { code?: unknown; errno?: unknown }
  if (
    typeof code === 'string' &&
    code.startsWith('E') &&
    !code.startsWith('ER_')
  ) {
    return code
  }
  if (typeof errno === 'number') return String(errno)
  return typeof code === 'string' ? code : undefined
}

/**
 * MySQL: uma conexão por operação, sessão em UTC, transação só de leitura,
 * prazo do banco e do gateway, leitura em fluxo até `maxRows`, `ROLLBACK` e
 * fechamento (SQX-03, SQX-04, SQX-10, SQX-11).
 */
export class MysqlGateway implements SqlGateway {
  constructor(
    private readonly createConnection: MysqlConnectionFactory = createMysqlConnection,
  ) {}

  async verify(
    cfg: SqlConnectionConfig,
    opts: { timeoutMs: number },
  ): Promise<void> {
    const connection = this.createConnection(
      mysqlConnectionOptions(cfg, opts.timeoutMs),
    )
    await runWithDeadline(
      { timeoutMs: opts.timeoutMs, toError: (error) => this.toError(error) },
      async () => {
        await connection.connect()
        await connection.query('SELECT 1')
      },
      async (timedOut) => {
        if (timedOut) connection.destroy()
        else await connection.end()
      },
    )
  }

  async read(
    cfg: SqlConnectionConfig,
    sql: string,
    values: unknown[],
    opts: SourceReadOptions,
  ): Promise<SourceResult> {
    const connection = this.createConnection(
      mysqlConnectionOptions(cfg, opts.timeoutMs),
    )
    let connected = false
    // Parar no meio do resultado deixa a conexão ocupada com o resto das linhas.
    let interrupted = false
    return runWithDeadline(
      {
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
        isTimeout: isQueryTimeout,
        toError: (error) => this.toError(error),
      },
      async () => {
        await connection.connect()
        connected = true
        await connection.query("SET SESSION time_zone = '+00:00'")
        await connection.query('START TRANSACTION READ ONLY')
        await connection.query(
          `SET SESSION max_execution_time = ${Math.max(1, Math.ceil(opts.timeoutMs))}`,
        )
        const result = connection.stream(sql, values.map(plainSqlValue))
        const limit = opts.maxRows ?? Number.POSITIVE_INFINITY
        const rows: unknown[][] = []
        if (limit <= 0) interrupted = true
        else {
          for await (const row of result.rows) {
            rows.push(row)
            if (rows.length >= limit) {
              interrupted = true
              break
            }
          }
        }
        return {
          keys: result.fields(),
          rows: rows.map((row) => row.map((value) => toSqlResultValue(value))),
        }
      },
      async (timedOut) => {
        // SPEC_DEVIATION: o MySQL não aceita outra instrução antes do fim do
        // resultado; quando a leitura para em `maxRows` (ou o prazo estoura) a
        // conexão é destruída e o servidor desfaz a transação ao perdê-la, no
        // lugar do `ROLLBACK` explícito, que só vale quando o resultado acabou.
        if (timedOut || interrupted) {
          connection.destroy()
          return
        }
        if (connected) {
          await connection.query('ROLLBACK').catch(() => undefined)
        }
        await connection.end()
      },
    )
  }

  private toError(error: unknown): SourceGatewayError {
    return new SourceGatewayError(
      error instanceof Error ? error.message : String(error),
      errorCode(error),
    )
  }
}
