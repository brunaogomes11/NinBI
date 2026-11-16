import { Inject, Injectable } from '@nestjs/common'
import {
  type ConnectionCreate,
  type ConnectionDto,
  MESSAGES,
} from '@ninbi/contracts'
import { eq, sql } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { CryptoService } from '../crypto/crypto.service'
import { type AppDatabase, DB } from '../database/database.module'
import { connectionSchemas, connections } from '../database/schema'
import {
  NEO4J_GATEWAY,
  type Neo4jConnectionConfig,
  type Neo4jGateway,
  Neo4jGatewayError,
  Neo4jTimeoutError,
} from '../neo4j/neo4j.gateway'

/** Prazo do teste de conexão (CONN-09). */
export const CONNECTION_VERIFY_TIMEOUT_MS = Symbol(
  'CONNECTION_VERIFY_TIMEOUT_MS',
)
export const DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS = 10_000

const UNIQUE_VIOLATION = '23505'

/** O driver (pg ou PGlite) pode embrulhar o erro original em `cause`. */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 3 && current; depth++) {
    if (
      typeof current === 'object' &&
      (current as { code?: unknown }).code === UNIQUE_VIOLATION
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
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
    uri: row.uri,
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
    @Inject(NEO4J_GATEWAY) private readonly neo4j: Neo4jGateway,
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

    await this.verify({
      uri: input.uri,
      database: input.database,
      username: input.username,
      password: input.password,
    })

    try {
      const [created] = await this.db
        .insert(connections)
        .values({
          name: input.name,
          uri: input.uri,
          database: input.database,
          username: input.username,
          passwordEncrypted: this.crypto.encrypt(input.password),
        })
        .returning()
      if (!created) throw new Error('conexão não inserida')
      return toConnectionDto(created, null)
    } catch (error) {
      // O índice único em lower(name) decide a corrida entre dois cadastros iguais (CONN-22).
      if (isUniqueViolation(error)) throw nameTaken()
      throw error
    }
  }

  /** Testa a conexão no Neo4j; recusa e prazo viram 422 (CONN-06, CONN-08, CONN-09). */
  private async verify(cfg: Neo4jConnectionConfig): Promise<void> {
    try {
      await this.neo4j.verify(cfg, { timeoutMs: this.verifyTimeoutMs })
    } catch (error) {
      if (error instanceof Neo4jTimeoutError) {
        throw new AppError(
          422,
          'NEO4J_TIMEOUT',
          MESSAGES.connectionVerifyTimeout,
        )
      }
      if (error instanceof Neo4jGatewayError) {
        throw new AppError(422, 'NEO4J_UNAVAILABLE', error.message)
      }
      throw error
    }
  }
}
