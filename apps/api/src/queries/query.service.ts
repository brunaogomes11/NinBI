import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  type ConnectionType,
  MESSAGES,
  type QueryResultDto,
} from '@ninbi/contracts'
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
  SourceGatewayError,
  type SourceResult,
  SourceTimeoutError,
  SourceUnavailableError,
  toSourceConnection,
} from '../sources/source'
import { SourceRegistry } from '../sources/source-registry'

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
  /** Cancela a consulta no banco (AIQ-13). */
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
  | 'SOURCE_UNAVAILABLE'
  | 'QUERY_FAILED'

/** Códigos do neo4j-driver que dizem que o servidor não foi alcançado. */
const UNAVAILABLE_CODES = new Set(['ServiceUnavailable', 'SessionExpired'])

/** O Neo4j mantém o código de hoje; as conexões SQL usam o das fontes. */
function unavailableCode(type: ConnectionType): QueryErrorCode {
  return type === 'NEO4J' ? 'NEO4J_UNAVAILABLE' : 'SOURCE_UNAVAILABLE'
}

/**
 * Execução de uma consulta pela fonte do tipo da conexão (AD-137), com
 * validação, prazo, limite de linhas, erros traduzidos e log (QRY-*, SQX-*).
 */
@Injectable()
export class QueryService {
  private readonly logger = new Logger('Query')

  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(SourceRegistry) private readonly sources: SourceRegistry,
    @Inject(QUERY_TIMEOUT_MS) private readonly timeoutMs: number,
    @Inject(QUERY_MAX_ROWS) private readonly maxRows: number,
  ) {}

  async run(input: RunQueryInput): Promise<QueryResultDto> {
    const started = Date.now()
    let rows = 0
    let result: LogResult = 'failed'
    let type: ConnectionType | '-' = '-'
    try {
      // O tipo da conexão escolhe a fonte, e a fonte, o validador.
      const connection = await this.findConnection(input.connectionId)
      type = connection.type
      const source = this.sources.for(connection.type)
      const check = source.validate(input.cypher)
      if (!check.ok) {
        result = 'blocked'
        throw new AppError(
          400,
          check.code,
          input.maskErrors ? MESSAGES.widgetLoadFailed : check.message,
        )
      }
      let password: string
      try {
        password = this.crypto.decrypt(connection.passwordEncrypted)
      } catch {
        result = 'unavailable'
        throw this.fail(
          unavailableCode(connection.type),
          MESSAGES.neo4jUnreachable(connection.name),
          input.maskErrors,
        )
      }
      const params: Record<string, unknown> = {}
      for (const name of source.parameterNames(input.cypher)) {
        params[name] = null
      }
      Object.assign(params, input.params)

      let read: SourceResult
      try {
        read = await source.run(
          toSourceConnection(connection, password),
          input.cypher,
          params,
          {
            timeoutMs: this.timeoutMs,
            maxRows: this.maxRows + 1,
            signal: input.signal,
          },
        )
      } catch (error) {
        const translated = this.translate(error, connection, input)
        result = translated.result
        throw translated.error
      }

      const truncated = read.rows.length > this.maxRows
      const kept = truncated ? read.rows.slice(0, this.maxRows) : read.rows
      rows = kept.length
      result = truncated ? 'truncated' : 'ok'
      return {
        columns: read.keys,
        rows: kept,
        truncated,
        rowLimit: this.maxRows,
      }
    } finally {
      this.logger.log(
        `query user=${input.userId} connection=${input.connectionId} type=${type} widget=${input.widgetId ?? '-'} durationMs=${Date.now() - started} rows=${rows} result=${result}`,
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
    connection: { name: string; type: ConnectionType },
    input: RunQueryInput,
  ): { error: AppError; result: LogResult } {
    const mask = input.maskErrors
    if (error instanceof SourceTimeoutError) {
      return {
        result: 'timeout',
        error: this.fail(
          'QUERY_TIMEOUT',
          MESSAGES.queryTimeout(Math.round(this.timeoutMs / 1000)),
          mask,
        ),
      }
    }
    if (error instanceof SourceGatewayError) {
      if (
        error.code === 'Neo.ClientError.Statement.AccessMode' ||
        /access mode/i.test(error.message)
      ) {
        return {
          result: 'blocked',
          error: this.fail('QUERY_WRITE_BLOCKED', MESSAGES.queryReadOnly, mask),
        }
      }
      // Erro de rede do driver SQL (SQX-14, SQX-26) ou servidor Neo4j fora do ar.
      if (
        error instanceof SourceUnavailableError ||
        (error.code !== undefined && UNAVAILABLE_CODES.has(error.code))
      ) {
        return {
          result: 'unavailable',
          error: this.fail(
            unavailableCode(connection.type),
            MESSAGES.neo4jUnreachable(connection.name),
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
