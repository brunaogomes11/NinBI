import pg from 'pg'
import Cursor from 'pg-cursor'
import { toSqlResultValue } from '../../queries/sql-result-value'
import type { SourceReadOptions, SourceResult } from '../source'
import { runWithDeadline } from './run-with-deadline'
import {
  plainSqlValue,
  type SqlConnectionConfig,
  type SqlGateway,
} from './sql.gateway'

/** Margem dos prazos do driver sobre o prazo da operação: o temporizador do gateway decide. */
const DRIVER_TIMEOUT_MARGIN_MS = 5_000
/** Linhas pedidas ao cursor por vez. */
const BATCH_ROWS = 500

/** OIDs dos tipos do PostgreSQL que o gateway trata. */
export const PG_TYPES = {
  INT8: 20,
  NUMERIC: 1700,
  DATE: 1082,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
} as const

/** `2024-01-15 10:30:00.5` vira `2024-01-15T10:30:00.5` (sem fuso, como gravada). */
export function pgTimestampText(text: string): string {
  return /^\d{4,}-\d\d-\d\d \d/.test(text) ? text.replace(' ', 'T') : text
}

const TIMESTAMPTZ =
  /^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)(\.\d+)?([+-]\d\d)(?::(\d\d))?$/

/** `2024-01-15 07:30:00.5-03` vira `2024-01-15T10:30:00.5Z` (ISO 8601 em UTC). */
export function pgTimestamptzText(text: string): string {
  const match = TIMESTAMPTZ.exec(text)
  if (match === null) return text
  const [, date, time, fraction = '', hours, minutes = '00'] = match
  const instant = new Date(`${date}T${time}${hours}:${minutes}`)
  if (Number.isNaN(instant.getTime())) return text
  return instant.toISOString().replace(/\.\d{3}Z$/, `${fraction}Z`)
}

const PARSERS: Record<number, (text: string) => unknown> = {
  [PG_TYPES.INT8]: (text) => BigInt(text),
  [PG_TYPES.NUMERIC]: (text) => text,
  [PG_TYPES.DATE]: (text) => text,
  [PG_TYPES.TIMESTAMP]: pgTimestampText,
  [PG_TYPES.TIMESTAMPTZ]: pgTimestamptzText,
}

const getTypeParser = ((oid: number, format?: 'text' | 'binary') => {
  const parser = format === 'binary' ? undefined : PARSERS[oid]
  return parser ?? pg.types.getTypeParser(oid, format as 'text')
}) as typeof pg.types.getTypeParser

/**
 * Configuração do cliente `pg` (função pura): SSL com validação do certificado
 * ou sem criptografia (SRC-12, SRC-13); data e hora como texto, `int8` como
 * `bigint` e `numeric` como texto (SQX-21, SQX-22); `bytea` segue `Buffer`.
 */
export function pgClientConfig(
  cfg: SqlConnectionConfig,
  timeoutMs: number,
): pg.ClientConfig {
  return {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.username,
    password: cfg.password,
    ssl: cfg.ssl ? { rejectUnauthorized: true } : false,
    connectionTimeoutMillis: timeoutMs + DRIVER_TIMEOUT_MARGIN_MS,
    types: { getTypeParser },
  }
}

export interface PgField {
  name: string
  dataTypeID: number
}

export interface PgCursor {
  /** Até `rows` linhas, cada uma como lista na ordem das colunas; vazia no fim. */
  read(rows: number): Promise<unknown[][]>
  /** As colunas, conhecidas depois da primeira leitura. */
  fields(): PgField[]
  close(): Promise<void>
}

/** O que o gateway usa de uma conexão do PostgreSQL. */
export interface PgClient {
  connect(): Promise<void>
  query(text: string): Promise<void>
  cursor(text: string, values: unknown[]): PgCursor
  end(): Promise<void>
}

export type PgClientFactory = (config: pg.ClientConfig) => PgClient

/** Cliente real: `pg.Client` e `pg-cursor`. */
export const createPgClient: PgClientFactory = (config) => {
  const client = new pg.Client(config)
  // Sem listener, a queda da conexão vira exceção não tratada no processo.
  client.on('error', () => undefined)
  return {
    connect: async () => {
      await client.connect()
    },
    query: async (text) => {
      await client.query(text)
    },
    cursor: (text, values) => {
      // O cursor não herda os parsers do cliente: recebe os mesmos aqui.
      const cursor = client.query(
        new Cursor<unknown[]>(text, values, {
          rowMode: 'array',
          types: config.types,
        }),
      )
      let fields: PgField[] = []
      return {
        read: (rows) =>
          new Promise<unknown[][]>((resolve, reject) => {
            cursor.read(rows, (error, batch, result) => {
              if (error) return reject(error)
              // Depois do fim o `pg-cursor` responde sem o resultado.
              if (result?.fields) fields = result.fields
              resolve(batch)
            })
          }),
        fields: () => fields,
        close: () => cursor.close(),
      }
    },
    end: () => client.end(),
  }
}

/** Prazo vencido do lado do banco: `statement_timeout` cancela com `57014`. */
function isStatementTimeout(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === '57014'
}

/**
 * PostgreSQL: uma conexão por operação, transação só de leitura, prazo do
 * banco e do gateway, leitura em fluxo por cursor até `maxRows`, `ROLLBACK` e
 * fechamento (SQX-03, SQX-04, SQX-10, SQX-11).
 */
export class PgGateway implements SqlGateway {
  constructor(
    private readonly createClient: PgClientFactory = createPgClient,
  ) {}

  async verify(
    cfg: SqlConnectionConfig,
    opts: { timeoutMs: number },
  ): Promise<void> {
    const client = this.createClient(pgClientConfig(cfg, opts.timeoutMs))
    await runWithDeadline(
      { timeoutMs: opts.timeoutMs },
      async () => {
        await client.connect()
        await client.query('SELECT 1')
      },
      () => client.end(),
    )
  }

  async read(
    cfg: SqlConnectionConfig,
    sql: string,
    values: unknown[],
    opts: SourceReadOptions,
  ): Promise<SourceResult> {
    const client = this.createClient(pgClientConfig(cfg, opts.timeoutMs))
    let connected = false
    return runWithDeadline(
      {
        timeoutMs: opts.timeoutMs,
        signal: opts.signal,
        isTimeout: isStatementTimeout,
      },
      async () => {
        await client.connect()
        connected = true
        await client.query('BEGIN TRANSACTION READ ONLY')
        await client.query(
          `SET LOCAL statement_timeout = ${Math.max(1, Math.ceil(opts.timeoutMs))}`,
        )
        const cursor = client.cursor(sql, values.map(plainSqlValue))
        const rows: unknown[][] = []
        try {
          const limit = opts.maxRows ?? Number.POSITIVE_INFINITY
          while (rows.length < limit) {
            const batch = await cursor.read(
              Math.min(BATCH_ROWS, limit - rows.length),
            )
            if (batch.length === 0) break
            rows.push(...batch)
          }
        } finally {
          await cursor.close().catch(() => undefined)
        }
        const fields = cursor.fields()
        const decimal = fields.map(
          (field) => field.dataTypeID === PG_TYPES.NUMERIC,
        )
        return {
          keys: fields.map((field) => field.name),
          rows: rows
            .slice(0, opts.maxRows)
            .map((row) =>
              row.map((value, i) =>
                toSqlResultValue(value, { decimal: decimal[i] }),
              ),
            ),
        }
      },
      async (timedOut) => {
        // Com o prazo estourado só fecha: a queda da conexão desfaz a transação.
        if (connected && !timedOut) {
          await client.query('ROLLBACK').catch(() => undefined)
        }
        await client.end()
      },
    )
  }
}
