import { Readable } from 'node:stream'
import sql from 'mssql'
import { toSqlResultValue } from '../../queries/sql-result-value'
import {
  SourceGatewayError,
  type SourceReadOptions,
  type SourceResult,
} from '../source'
import { runWithDeadline } from './run-with-deadline'
import {
  type SqlConnectionConfig,
  SqlDateParam,
  type SqlGateway,
} from './sql.gateway'

/** Margem do prazo de conexão do driver: o temporizador do gateway decide. */
const DRIVER_TIMEOUT_MARGIN_MS = 5_000
/** Linhas guardadas no fluxo antes de pausar a leitura do socket. */
const STREAM_HIGH_WATER_MARK = 500

/**
 * Configuração do `mssql` (função pura): `encrypt` com validação do
 * certificado ou sem criptografia (SRC-12, SRC-13), prazo da requisição, uma
 * conexão só, linhas como listas e data sem fuso lida como gravada (`useUTC`).
 */
export function mssqlConfig(
  cfg: SqlConnectionConfig,
  timeoutMs: number,
): sql.config {
  return {
    server: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.username,
    password: cfg.password,
    connectionTimeout: timeoutMs + DRIVER_TIMEOUT_MARGIN_MS,
    requestTimeout: timeoutMs,
    arrayRowMode: true,
    pool: { min: 0, max: 1 },
    options: {
      encrypt: cfg.ssl,
      trustServerCertificate: false,
      useUTC: true,
    },
  }
}

export interface MssqlColumn {
  name: string
  /** O tipo do SQL Server em minúsculas (`datetimeoffset`, `bigint`...). */
  type: string
}

export interface MssqlParam {
  name: string
  value: unknown
  /** Data `AAAA-MM-DD` enviada como `sql.Date` (SQX-20). */
  date?: boolean
}

export interface MssqlRequest {
  /** As colunas, conhecidas antes da primeira linha. */
  columns(): MssqlColumn[]
  rows: AsyncIterable<unknown[]>
  cancel(): void
  /** Termina quando a requisição acabou ou foi cancelada. */
  finished(): Promise<void>
}

/** O que o gateway usa de uma conexão do SQL Server. */
export interface MssqlSession {
  connect(): Promise<void>
  begin(): Promise<void>
  query(text: string, params: MssqlParam[]): MssqlRequest
  rollback(): Promise<void>
  close(): Promise<void>
}

export type MssqlSessionFactory = (config: sql.config) => MssqlSession

/** Sessão real: um `ConnectionPool` de uma conexão, uma transação, requisição em fluxo. */
export const createMssqlSession: MssqlSessionFactory = (config) => {
  const pool = new sql.ConnectionPool(config)
  // Sem listener, a queda da conexão vira exceção não tratada no processo.
  pool.on('error', () => undefined)
  let transaction: sql.Transaction | null = null
  return {
    connect: async () => {
      await pool.connect()
    },
    begin: async () => {
      transaction = new sql.Transaction(pool)
      await transaction.begin()
    },
    query: (text, params) => {
      const request = transaction
        ? new sql.Request(transaction)
        : new sql.Request(pool)
      request.stream = true
      request.arrayRowMode = true
      for (const param of params) {
        if (param.date) {
          request.input(
            param.name,
            sql.Date,
            new Date(`${String(param.value)}T00:00:00Z`),
          )
        } else request.input(param.name, param.value)
      }
      let columns: MssqlColumn[] = []
      const rows = new Readable({
        objectMode: true,
        highWaterMark: STREAM_HIGH_WATER_MARK,
        read: () => {
          request.resume()
        },
      })
      const finished = new Promise<void>((resolve) => {
        request.on('done', () => resolve())
      })
      request.on(
        'recordset',
        (meta: { name: string; type?: { declaration?: string } }[]) => {
          columns = meta.map((column) => ({
            name: column.name,
            type: column.type?.declaration ?? '',
          }))
        },
      )
      request.on('row', (row: unknown[]) => {
        if (!rows.push(row)) request.pause()
      })
      request.on('error', (error: Error) => rows.destroy(error))
      request.on('done', () => rows.push(null))
      request.query(text, () => undefined)
      return {
        columns: () => columns,
        rows,
        cancel: () => request.cancel(),
        finished: () => finished,
      }
    },
    rollback: async () => {
      await transaction?.rollback()
    },
    close: () => pool.close(),
  }
}

/** ISO sem os milissegundos quando são zero (`2024-01-15T10:30:00`). */
function isoText(date: Date): string {
  return date.toISOString().replace('.000Z', 'Z')
}

/**
 * Valor do SQL Server pelo tipo da coluna (SQX-21, SQX-22): `datetimeoffset`
 * em ISO em UTC; `datetime`, `datetime2` e `smalldatetime` em ISO sem `Z`;
 * `date` em `AAAA-MM-DD`; `bigint` (texto no driver) como `bigint`.
 */
// SPEC_DEVIATION: o `tedious` (driver do `mssql`) entrega `decimal`/`numeric`
// já como `number`, sem opção de texto; o valor sai exato até 15 dígitos
// significativos e, acima disso, com o arredondamento do driver (não vira texto).
// `datetime2` sai com milissegundos, a precisão do `Date` do driver.
export function mssqlValue(value: unknown, type: string): unknown {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    switch (type) {
      case 'datetimeoffset':
        return isoText(value)
      case 'date':
        return value.toISOString().slice(0, 10)
      case 'time':
        return isoText(value).slice(11, -1)
      default:
        // `datetime`, `datetime2`, `smalldatetime`: o driver lê como UTC (`useUTC`).
        return isoText(value).slice(0, -1)
    }
  }
  if (type === 'bigint' && typeof value === 'string' && /^-?\d+$/.test(value)) {
    return BigInt(value)
  }
  return value
}

/** Prazo da requisição vencido no driver. */
function isRequestTimeout(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'ETIMEOUT'
}

/** O código do SQL Server é o número do erro (`208`); o de conexão segue (`ESOCKET`). */
function errorCode(error: unknown): string | undefined {
  const { code, number } = (error ?? {}) as { code?: unknown; number?: unknown }
  if (typeof number === 'number') return String(number)
  return typeof code === 'string' ? code : undefined
}

function toError(error: unknown): SourceGatewayError {
  return new SourceGatewayError(
    error instanceof Error ? error.message : String(error),
    errorCode(error),
  )
}

/**
 * SQL Server: o banco não tem transação de leitura, então a consulta roda em
 * `BEGIN TRANSACTION` que termina sempre em `ROLLBACK`, e o validador de SQL
 * barra a escrita antes (SQX-03). Prazo pelo `requestTimeout` e por
 * `cancel()`, leitura em fluxo até `maxRows` e fechamento (SQX-10, SQX-11).
 */
export class MssqlGateway implements SqlGateway {
  constructor(
    private readonly createSession: MssqlSessionFactory = createMssqlSession,
  ) {}

  async verify(
    cfg: SqlConnectionConfig,
    opts: { timeoutMs: number },
  ): Promise<void> {
    const session = this.createSession(mssqlConfig(cfg, opts.timeoutMs))
    await runWithDeadline(
      { timeoutMs: opts.timeoutMs, toError },
      async () => {
        await session.connect()
        const request = session.query('SELECT 1', [])
        for await (const _ of request.rows) {
          // Só prova que a consulta roda.
        }
      },
      () => session.close(),
    )
  }

  async read(
    cfg: SqlConnectionConfig,
    text: string,
    values: unknown[],
    opts: SourceReadOptions,
  ): Promise<SourceResult> {
    const session = this.createSession(mssqlConfig(cfg, opts.timeoutMs))
    let begun = false
    let request: MssqlRequest | null = null
    return runWithDeadline(
      {
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
        isTimeout: isRequestTimeout,
        toError,
      },
      async () => {
        await session.connect()
        await session.begin()
        begun = true
        const params = values.map((value, i) =>
          value instanceof SqlDateParam
            ? { name: `p${i + 1}`, value: value.value, date: true }
            : { name: `p${i + 1}`, value },
        )
        const current = session.query(text, params)
        request = current
        const limit = opts.maxRows ?? Number.POSITIVE_INFINITY
        const rows: unknown[][] = []
        let stopped = limit <= 0
        if (!stopped) {
          for await (const row of current.rows) {
            rows.push(row as unknown[])
            if (rows.length >= limit) {
              stopped = true
              break
            }
          }
        }
        if (stopped) {
          // Para o resto do resultado no servidor antes do ROLLBACK.
          current.cancel()
          await current.finished()
        }
        const columns = current.columns()
        return {
          keys: columns.map((column) => column.name),
          rows: rows.map((row) =>
            row.map((value, i) =>
              toSqlResultValue(mssqlValue(value, columns[i]?.type ?? '')),
            ),
          ),
        }
      },
      async (timedOut) => {
        if (timedOut) {
          ;(request as MssqlRequest | null)?.cancel()
        } else if (begun) {
          await session.rollback().catch(() => undefined)
        }
        await session.close()
      },
    )
  }
}
