import { Inject, Injectable } from '@nestjs/common'
import {
  type ConnectionCreate,
  type ConnectionDto,
  type ConnectionType,
  type ConnectionUpdate,
  MESSAGES,
} from '@ninbi/contracts'
import { count, eq, sql } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { CryptoService } from '../crypto/crypto.service'
import { type AppDatabase, DB } from '../database/database.module'
import { connectionSchemas, connections, dashboards } from '../database/schema'
import { SchemaRefreshService } from '../schema/schema-refresh.service'
import {
  SourceGatewayError,
  SourceTimeoutError,
  toSourceConnection,
} from '../sources/source'
import { SourceRegistry } from '../sources/source-registry'
import { connectionNotFound, isConnectionId } from './connection-errors'

/** Prazo do teste de conexão (CONN-09). */
export const CONNECTION_VERIFY_TIMEOUT_MS = Symbol(
  'CONNECTION_VERIFY_TIMEOUT_MS',
)
export const DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS = 10_000

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

/** O driver (pg ou PGlite) pode embrulhar o erro original em `cause`. */
function hasPostgresCode(error: unknown, code: string): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 3 && current; depth++) {
    if (
      typeof current === 'object' &&
      (current as { code?: unknown }).code === code
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
}

function isUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, UNIQUE_VIOLATION)
}

function isForeignKeyViolation(error: unknown): boolean {
  return hasPostgresCode(error, FOREIGN_KEY_VIOLATION)
}

function connectionInUse(count: number): AppError {
  return new AppError(409, 'CONNECTION_IN_USE', MESSAGES.connectionInUse(count))
}

/** Campos de endereço que a conexão guarda, pelo tipo (AD-136). */
type ConnectionInput = ConnectionCreate | ConnectionUpdate

function addressOf(input: ConnectionInput) {
  if (input.type === 'NEO4J') {
    return { uri: input.uri, host: null, port: null, ssl: false }
  }
  return { uri: null, host: input.host, port: input.port, ssl: input.ssl }
}

/** O Neo4j mantém os códigos de hoje; as conexões SQL usam os das fontes. */
function unavailableCode(type: ConnectionType) {
  return type === 'NEO4J' ? 'NEO4J_UNAVAILABLE' : 'SOURCE_UNAVAILABLE'
}

function nameTaken(): AppError {
  return new AppError(
    409,
    'CONNECTION_NAME_TAKEN',
    MESSAGES.connectionNameTaken,
    { name: MESSAGES.connectionNameTaken },
  )
}

/** Única função que vira linha em DTO: nunca leva a senha (CONN-14). */
export function toConnectionDto(
  row: typeof connections.$inferSelect,
  schemaReadAt: Date | null,
): ConnectionDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    uri: row.uri,
    host: row.host,
    port: row.port,
    ssl: row.ssl,
    database: row.database,
    username: row.username,
    schemaStatus: row.schemaStatus,
    schemaReadAt: schemaReadAt?.toISOString() ?? null,
  }
}

@Injectable()
export class ConnectionsService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(SourceRegistry) private readonly sources: SourceRegistry,
    @Inject(SchemaRefreshService)
    private readonly refresh: SchemaRefreshService,
    @Inject(CONNECTION_VERIFY_TIMEOUT_MS)
    private readonly verifyTimeoutMs: number,
  ) {}

  async list(): Promise<ConnectionDto[]> {
    const rows = await this.db
      .select({ connection: connections, readAt: connectionSchemas.readAt })
      .from(connections)
      .leftJoin(
        connectionSchemas,
        eq(connectionSchemas.connectionId, connections.id),
      )
      .orderBy(sql`lower(${connections.name})`, connections.name)
    return rows.map(({ connection, readAt }) =>
      toConnectionDto(connection, readAt),
    )
  }

  async create(input: ConnectionCreate): Promise<ConnectionDto> {
    const [existing] = await this.db
      .select({ id: connections.id })
      .from(connections)
      .where(sql`lower(${connections.name}) = lower(${input.name})`)
    if (existing) throw nameTaken()

    const address = addressOf(input)
    await this.verify(
      {
        id: '',
        name: input.name,
        type: input.type,
        ...address,
        database: input.database,
        username: input.username,
      },
      input.password,
    )

    try {
      const [created] = await this.db
        .insert(connections)
        .values({
          name: input.name,
          type: input.type,
          ...address,
          database: input.database,
          username: input.username,
          passwordEncrypted: this.crypto.encrypt(input.password),
        })
        .returning()
      if (!created) throw new Error('conexão não inserida')
      // A leitura do schema roda em segundo plano: só o claim é esperado (SCH-01).
      const state = await this.refresh.start(created.id)
      return toConnectionDto({ ...created, schemaStatus: state.status }, null)
    } catch (error) {
      // O índice único em lower(name) decide a corrida entre dois cadastros iguais (CONN-22).
      if (isUniqueViolation(error)) throw nameTaken()
      throw error
    }
  }

  /** Senha vazia ou ausente mantém a guardada (CONN-15); a conexão é testada de novo antes de gravar (CONN-16). */
  async update(id: string, input: ConnectionUpdate): Promise<ConnectionDto> {
    const current = await this.find(id)
    // A consulta dos widgets está no idioma do tipo: o tipo não muda (SRC-16).
    if (input.type !== current.type) {
      throw new AppError(
        422,
        'CONNECTION_TYPE_LOCKED',
        MESSAGES.connectionTypeLocked,
        { type: MESSAGES.connectionTypeLocked },
      )
    }
    const newPassword = input.password || null
    let password: string
    if (newPassword) {
      password = newPassword
    } else {
      try {
        password = this.crypto.decrypt(current.passwordEncrypted)
      } catch {
        throw new AppError(
          422,
          unavailableCode(current.type),
          MESSAGES.connectionPasswordUndecryptable,
        )
      }
    }

    const address = addressOf(input)
    await this.verify(
      {
        id,
        name: input.name,
        type: current.type,
        ...address,
        database: input.database,
        username: input.username,
      },
      password,
    )

    try {
      const [updated] = await this.db
        .update(connections)
        .set({
          name: input.name,
          ...address,
          database: input.database,
          username: input.username,
          ...(newPassword
            ? { passwordEncrypted: this.crypto.encrypt(newPassword) }
            : {}),
          updatedAt: sql`now()`,
        })
        .where(eq(connections.id, id))
        .returning()
      if (!updated) throw connectionNotFound()
      const [schema] = await this.db
        .select({ readAt: connectionSchemas.readAt })
        .from(connectionSchemas)
        .where(eq(connectionSchemas.connectionId, id))
      return toConnectionDto(updated, schema?.readAt ?? null)
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken()
      throw error
    }
  }

  /** A cascata do banco apaga o schema guardado e as escolhas de exemplo (CONN-18). */
  async remove(id: string): Promise<void> {
    if (!isConnectionId(id)) throw connectionNotFound()
    const inUse = await this.countDashboards(id)
    if (inUse > 0) throw connectionInUse(inUse)
    let deleted: unknown[]
    try {
      deleted = await this.db
        .delete(connections)
        .where(eq(connections.id, id))
        .returning()
    } catch (error) {
      // Um dashboard nasceu entre a contagem e a exclusão: a chave estrangeira segura.
      if (isForeignKeyViolation(error)) {
        throw connectionInUse(await this.countDashboards(id))
      }
      throw error
    }
    if (deleted.length === 0) throw connectionNotFound()
  }

  private async countDashboards(connectionId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(dashboards)
      .where(eq(dashboards.connectionId, connectionId))
    return row?.value ?? 0
  }

  private async find(id: string) {
    if (!isConnectionId(id)) throw connectionNotFound()
    const [row] = await this.db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
    if (!row) throw connectionNotFound()
    return row
  }

  /**
   * Testa a conexão pela fonte do tipo; recusa e prazo viram 422 com a
   * mensagem do banco (CONN-06, CONN-08, CONN-09, SRC-05, SRC-07, SRC-08).
   */
  private async verify(
    row: Parameters<typeof toSourceConnection>[0],
    password: string,
  ): Promise<void> {
    const source = this.sources.for(row.type)
    try {
      await source.verify(toSourceConnection(row, password), {
        timeoutMs: this.verifyTimeoutMs,
      })
    } catch (error) {
      if (error instanceof SourceTimeoutError) {
        throw new AppError(
          422,
          row.type === 'NEO4J' ? 'NEO4J_TIMEOUT' : 'SOURCE_TIMEOUT',
          MESSAGES.connectionVerifyTimeout,
        )
      }
      if (error instanceof SourceGatewayError) {
        throw new AppError(422, unavailableCode(row.type), error.message)
      }
      throw error
    }
  }
}
