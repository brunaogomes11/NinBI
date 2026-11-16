import { Inject, Injectable, Logger } from '@nestjs/common'
import { MESSAGES, type SchemaStateDto } from '@ninbi/contracts'
import { and, eq, lt, ne, or, sql } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { Clock } from '../common/clock'
import { CryptoService } from '../crypto/crypto.service'
import { type AppDatabase, DB } from '../database/database.module'
import {
  type ConnectionRow,
  connectionSchemas,
  connections,
  schemaExampleOptOuts,
} from '../database/schema'
import { Neo4jTimeoutError } from '../neo4j/neo4j.gateway'
import { SchemaReader } from './schema-reader'
import type { StoredSchema } from './types'

/** Prazo da leitura inteira do schema (SCH-10). */
export const SCHEMA_READ_TIMEOUT_MS = Symbol('SCHEMA_READ_TIMEOUT_MS')
export const DEFAULT_SCHEMA_READ_TIMEOUT_MS = 120_000

/** Um READING iniciado há mais que isto é de um processo que reiniciou e pode ser retomado. */
const ORPHAN_READING_MS = 150_000

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ReadResult = 'ok' | 'failed' | 'timeout' | 'discarded'

function hasProperty(
  schema: StoredSchema,
  kind: 'LABEL' | 'RELATIONSHIP',
  element: string,
  property: string,
): boolean {
  const elements = kind === 'LABEL' ? schema.labels : schema.relationshipTypes
  return elements.some(
    (candidate) =>
      candidate.name === element &&
      candidate.properties.some((p) => p.name === property),
  )
}

/** Máquina de estados da leitura do schema e gravação do cache (SCH-01, SCH-06 a SCH-11, SCH-14...). */
@Injectable()
export class SchemaRefreshService {
  private readonly logger = new Logger('Schema')
  private readonly running = new Map<string, Promise<void>>()

  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(SchemaReader) private readonly reader: SchemaReader,
    @Inject(SCHEMA_READ_TIMEOUT_MS) private readonly timeoutMs: number,
  ) {}

  /**
   * Pede uma leitura. O claim é um UPDATE atômico: quem não o obtém recebe o estado atual
   * sem iniciar outra leitura (SCH-11). A leitura roda em segundo plano.
   */
  async start(connectionId: string): Promise<SchemaStateDto> {
    if (!UUID_PATTERN.test(connectionId)) throw this.notFound()
    const now = this.clock.now()
    const orphanBefore = new Date(now.getTime() - ORPHAN_READING_MS)
    const [claimed] = await this.db
      .update(connections)
      .set({
        schemaStatus: 'READING',
        schemaReadStartedAt: now,
        schemaError: null,
      })
      .where(
        and(
          eq(connections.id, connectionId),
          or(
            ne(connections.schemaStatus, 'READING'),
            lt(connections.schemaReadStartedAt, orphanBefore),
          ),
        ),
      )
      .returning()

    if (claimed) {
      const run = this.execute(claimed).finally(() =>
        this.running.delete(connectionId),
      )
      this.running.set(connectionId, run)
    }
    return this.state(connectionId)
  }

  /** Só para testes: espera a leitura em segundo plano terminar. */
  async whenSettled(connectionId: string): Promise<void> {
    await this.running.get(connectionId)
  }

  private notFound(): AppError {
    return new AppError(
      404,
      'CONNECTION_NOT_FOUND',
      MESSAGES.connectionNotFound,
    )
  }

  /** Estado atual da leitura, sem iniciar nada. */
  async state(connectionId: string): Promise<SchemaStateDto> {
    const [row] = await this.db
      .select({
        status: connections.schemaStatus,
        startedAt: connections.schemaReadStartedAt,
        error: connections.schemaError,
        readAt: connectionSchemas.readAt,
      })
      .from(connections)
      .leftJoin(
        connectionSchemas,
        eq(connectionSchemas.connectionId, connections.id),
      )
      .where(eq(connections.id, connectionId))
    if (!row) throw this.notFound()
    return {
      status: row.status,
      readAt: row.readAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      error: row.error,
    }
  }

  private async execute(connection: ConnectionRow): Promise<void> {
    const startedAt = performance.now()
    let result: ReadResult = 'failed'
    let counts = { labels: 0, relationshipTypes: 0 }
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), this.timeoutMs)
    try {
      let password: string
      try {
        password = this.crypto.decrypt(connection.passwordEncrypted)
      } catch {
        await this.fail(connection.id, MESSAGES.connectionPasswordUndecryptable)
        return
      }
      const schema = await this.reader.read(
        {
          uri: connection.uri,
          database: connection.database,
          username: connection.username,
          password,
        },
        { deadline: Date.now() + this.timeoutMs, signal: abort.signal },
      )
      counts = {
        labels: schema.labels.length,
        relationshipTypes: schema.relationshipTypes.length,
      }
      result = await this.store(connection.id, schema)
    } catch (error) {
      const timedOut = error instanceof Neo4jTimeoutError
      const message = timedOut
        ? MESSAGES.schemaReadTimeout
        : error instanceof Error
          ? error.message
          : String(error)
      result = (await this.fail(connection.id, message))
        ? timedOut
          ? 'timeout'
          : 'failed'
        : 'discarded'
    } finally {
      clearTimeout(timer)
      this.logger.log(
        `schema read connection=${connection.id} durationMs=${Math.round(performance.now() - startedAt)} labels=${counts.labels} relationshipTypes=${counts.relationshipTypes} result=${result}`,
      )
    }
  }

  /** Marca FAILED e mantém o documento anterior; devolve false quando a conexão sumiu. */
  private async fail(connectionId: string, message: string): Promise<boolean> {
    const rows = await this.db
      .update(connections)
      .set({ schemaStatus: 'FAILED', schemaError: message })
      .where(eq(connections.id, connectionId))
      .returning()
    return rows.length > 0
  }

  /** Troca o documento, poda as escolhas órfãs e marca READY, tudo numa transação. */
  private async store(
    connectionId: string,
    schema: StoredSchema,
  ): Promise<ReadResult> {
    return this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: connections.id })
        .from(connections)
        .where(eq(connections.id, connectionId))
        .for('update')
      if (!locked) return 'discarded'

      const readAt = this.clock.now()
      await tx
        .insert(connectionSchemas)
        .values({ connectionId, readAt, document: schema })
        .onConflictDoUpdate({
          target: connectionSchemas.connectionId,
          set: { readAt, document: schema },
        })

      const optOuts = await tx
        .select()
        .from(schemaExampleOptOuts)
        .where(eq(schemaExampleOptOuts.connectionId, connectionId))
      for (const optOut of optOuts) {
        if (
          hasProperty(
            schema,
            optOut.elementKind,
            optOut.elementName,
            optOut.propertyName,
          )
        ) {
          continue
        }
        await tx
          .delete(schemaExampleOptOuts)
          .where(
            and(
              eq(schemaExampleOptOuts.connectionId, connectionId),
              eq(schemaExampleOptOuts.elementKind, optOut.elementKind),
              eq(schemaExampleOptOuts.elementName, optOut.elementName),
              eq(schemaExampleOptOuts.propertyName, optOut.propertyName),
            ),
          )
      }

      await tx
        .update(connections)
        .set({
          schemaStatus: 'READY',
          schemaError: null,
          updatedAt: sql`now()`,
        })
        .where(eq(connections.id, connectionId))
      return 'ok'
    })
  }
}
