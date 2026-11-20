import { Inject, Injectable } from '@nestjs/common'
import {
  type McpConnectionCreate,
  type McpConnectionDto,
  type McpConnectionUpdate,
  MESSAGES,
} from '@ninbi/contracts'
import { asc, eq } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { type AppDatabase, DB } from '../database/database.module'
import { mcpConnections } from '../database/schema'

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

function notFound() {
  return new AppError(404, 'CONNECTION_NOT_FOUND', MESSAGES.connectionNotFound)
}

@Injectable()
export class McpConnectionsService {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async list(manage: boolean): Promise<McpConnectionDto[]> {
    if (manage) {
      return this.db
        .select()
        .from(mcpConnections)
        .orderBy(asc(mcpConnections.name))
    }
    return this.db
      .select({ id: mcpConnections.id, name: mcpConnections.name })
      .from(mcpConnections)
      .orderBy(asc(mcpConnections.name))
  }

  async get(id: string) {
    if (!UUID_PATTERN.test(id)) throw notFound()
    const [connection] = await this.db
      .select()
      .from(mcpConnections)
      .where(eq(mcpConnections.id, id))
    if (!connection) throw notFound()
    return connection
  }

  async create(input: McpConnectionCreate) {
    const [connection] = await this.db
      .insert(mcpConnections)
      .values(input)
      .returning()
    if (!connection) throw new Error('Conexão MCP não inserida')
    return connection
  }

  async update(id: string, input: McpConnectionUpdate) {
    if (!UUID_PATTERN.test(id)) throw notFound()
    const { endpoint, enabledTools, name } = input
    const updates = {
      name,
      endpoint,
      enabledTools:
        endpoint !== undefined
          ? []
          : enabledTools && [...new Set(enabledTools)],
    }
    if (Object.values(updates).every((value) => value === undefined))
      return this.get(id)
    const [connection] = await this.db
      .update(mcpConnections)
      .set(updates)
      .where(eq(mcpConnections.id, id))
      .returning()
    if (!connection) throw notFound()
    return connection
  }
}
