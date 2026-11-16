import { Inject, Injectable, Logger } from '@nestjs/common'
import { MESSAGES, type QueryResultDto } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import {
  connectionNotFound,
  isConnectionId,
} from '../connections/connection-errors'
import { CryptoService } from '../crypto/crypto.service'
import { type AppDatabase, DB } from '../database/database.module'
import { connections } from '../database/schema'
import {
  NEO4J_GATEWAY,
  type Neo4jConnectionConfig,
  type Neo4jGateway,
  Neo4jGatewayError,
  Neo4jTimeoutError,
} from '../neo4j/neo4j.gateway'
import {
  extractParameterNames,
  validateReadOnlyCypher,
} from './read-only-cypher'
import { toResultValue } from './result-value'

export const QUERY_TIMEOUT_MS = Symbol('QUERY_TIMEOUT_MS')
export const QUERY_MAX_ROWS = Symbol('QUERY_MAX_ROWS')

export interface RunQueryInput {
  userId: string
  connectionId: string
  cypher: string
  params?: Record<string, unknown>
  widgetId?: string | null
  /** Quem só vê o dashboard não enxerga o erro do banco (TBL-12). */
  maskErrors?: boolean
  /** Cancela a consulta no Neo4j (AIQ-13). */
  signal?: AbortSignal
}

type LogResult =
  | 'ok'
  | 'truncated'
  | 'blocked'
  | 'timeout'
  | 'unavailable'
  | 'failed'

type QueryErrorCode =
  | 'QUERY_TIMEOUT'
  | 'QUERY_WRITE_BLOCKED'
  | 'NEO4J_UNAVAILABLE'
  | 'QUERY_FAILED'

const UNAVAILABLE_CODES = new Set(['ServiceUnavailable', 'SessionExpired'])

/** Execução de Cypher com validação, prazo, limite de linhas, erros traduzidos e log (QRY-*). */
@Injectable()
export class QueryService {
  private readonly logger = new Logger('Query')

  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(NEO4J_GATEWAY) private readonly gateway: Neo4jGateway,
    @Inject(QUERY_TIMEOUT_MS) private readonly timeoutMs: number,
    @Inject(QUERY_MAX_ROWS) private readonly maxRows: number,
  ) {}

  async run(input: RunQueryInput): Promise<QueryResultDto> {
    const started = Date.now()
    let rows = 0
    let result: LogResult = 'failed'
    try {
      const check = validateReadOnlyCypher(input.cypher)
      if (!check.ok) {
        result = 'blocked'
        throw new AppError(
          400,
          check.code,
          input.maskErrors ? MESSAGES.widgetLoadFailed : check.message,
        )
      }
      const connection = await this.findConnection(input.connectionId)
      let password: string
      try {
        password = this.crypto.decrypt(connection.passwordEncrypted)
      } catch {
        result = 'unavailable'
        throw this.fail(
          'NEO4J_UNAVAILABLE',
          MESSAGES.neo4jUnreachable(connection.name),
          input.maskErrors,
        )
      }
      const cfg: Neo4jConnectionConfig = {
        uri: connection.uri,
        database: connection.database,
        username: connection.username,
        password,
      }
      const params: Record<string, unknown> = {}
      for (const name of extractParameterNames(input.cypher)) {
        params[name] = null
      }
      Object.assign(params, input.params)

      let read: Awaited<ReturnType<Neo4jGateway['read']>>
      try {
        read = await this.gateway.read(cfg, input.cypher, params, {
          timeoutMs: this.timeoutMs,
          maxRows: this.maxRows + 1,
          signal: input.signal,
        })
      } catch (error) {
        const translated = this.translate(error, connection.name, input)
        result = translated.result
        throw translated.error
      }

      const truncated = read.rows.length > this.maxRows
      const kept = truncated ? read.rows.slice(0, this.maxRows) : read.rows
      rows = kept.length
      result = truncated ? 'truncated' : 'ok'
      return {
        columns: read.keys,
        rows: kept.map((row) =>
          read.keys.map((key) => toResultValue(row[key])),
        ),
        truncated,
        rowLimit: this.maxRows,
      }
    } finally {
      this.logger.log(
        `query user=${input.userId} connection=${input.connectionId} widget=${input.widgetId ?? '-'} durationMs=${Date.now() - started} rows=${rows} result=${result}`,
      )
    }
  }

  private async findConnection(id: string) {
    if (!isConnectionId(id)) throw connectionNotFound()
    const [connection] = await this.db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
    if (!connection) throw connectionNotFound()
    return connection
  }

  private translate(
    error: unknown,
    connectionName: string,
    input: RunQueryInput,
  ): { error: AppError; result: LogResult } {
    const mask = input.maskErrors
    if (error instanceof Neo4jTimeoutError) {
      return {
        result: 'timeout',
        error: this.fail(
          'QUERY_TIMEOUT',
          MESSAGES.queryTimeout(Math.round(this.timeoutMs / 1000)),
          mask,
        ),
      }
    }
    if (error instanceof Neo4jGatewayError) {
      if (
        error.code === 'Neo.ClientError.Statement.AccessMode' ||
        /access mode/i.test(error.message)
      ) {
        return {
          result: 'blocked',
          error: this.fail('QUERY_WRITE_BLOCKED', MESSAGES.queryReadOnly, mask),
        }
      }
      if (error.code !== undefined && UNAVAILABLE_CODES.has(error.code)) {
        return {
          result: 'unavailable',
          error: this.fail(
            'NEO4J_UNAVAILABLE',
            MESSAGES.neo4jUnreachable(connectionName),
            mask,
          ),
        }
      }
      const failed = this.fail('QUERY_FAILED', error.message, mask)
      // Só o código segue para quem decide a correção; o filtro de erros não o serializa (FIX-04).
      failed.neo4jCode = error.code
      return { result: 'failed', error: failed }
    }
    throw error
  }

  private fail(
    code: QueryErrorCode,
    message: string,
    mask: boolean | undefined,
  ): AppError {
    return new AppError(422, code, mask ? MESSAGES.widgetLoadFailed : message)
  }
}
