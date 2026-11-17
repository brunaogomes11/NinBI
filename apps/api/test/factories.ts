import type { ConnectionType, Role } from '@ninbi/contracts'
import { PasswordHasher } from '../src/auth/password-hasher'
import type { CryptoService } from '../src/crypto/crypto.service'
import type { AppDatabase } from '../src/database/database.module'
import {
  connections,
  dashboardShares,
  dashboards,
  teamMembers,
  teams,
  users,
} from '../src/database/schema'

export interface TestUserInput {
  name?: string
  email?: string
  password?: string
  role?: Role
  status?: 'ACTIVE' | 'DISABLED'
  mustChangePassword?: boolean
}

/** Insere um usuário direto no banco, com a senha já em hash. Padrão: senha "senha-correta-123". */
export async function createUser(db: AppDatabase, input: TestUserInput = {}) {
  const passwordHash = await new PasswordHasher().hash(
    input.password ?? 'senha-correta-123',
  )
  const [row] = await db
    .insert(users)
    .values({
      name: input.name ?? 'Ana',
      email: input.email ?? 'ana@x.com',
      passwordHash,
      role: input.role ?? 'EDITOR',
      status: input.status ?? 'ACTIVE',
      mustChangePassword: input.mustChangePassword ?? false,
    })
    .returning()
  if (!row) throw new Error('usuário não inserido')
  return row
}

export interface TestConnectionInput {
  name?: string
  /** Padrão NEO4J; os tipos SQL usam host, porta e banco no lugar da URI. */
  type?: ConnectionType
  uri?: string
  host?: string
  port?: number
  ssl?: boolean
  database?: string | null
  username?: string
  password?: string
}

/** Insere uma conexão direto no banco, com a senha cifrada pelo `CryptoService` do app. Padrão: senha "segredo". */
export async function createConnection(
  db: AppDatabase,
  crypto: CryptoService,
  input: TestConnectionInput = {},
) {
  const type = input.type ?? 'NEO4J'
  const sqlType = type !== 'NEO4J'
  const [row] = await db
    .insert(connections)
    .values({
      name: input.name ?? 'Vendas',
      type,
      uri: sqlType ? null : (input.uri ?? 'neo4j://vendas.exemplo:7687'),
      host: sqlType ? (input.host ?? 'sql.exemplo') : null,
      port: sqlType ? (input.port ?? 5432) : null,
      ssl: input.ssl ?? false,
      database: sqlType
        ? (input.database ?? 'vendas')
        : (input.database ?? null),
      username: input.username ?? 'neo4j',
      passwordEncrypted: crypto.encrypt(input.password ?? 'segredo'),
    })
    .returning()
  if (!row) throw new Error('conexão não inserida')
  return row
}

export interface TestDashboardInput {
  ownerId: string
  connectionId: string
  name?: string
  createdAt?: Date
}

/** Insere um dashboard direto no banco, sem abas nem widgets. */
export async function createDashboard(
  db: AppDatabase,
  input: TestDashboardInput,
) {
  const [row] = await db
    .insert(dashboards)
    .values({
      name: input.name ?? 'Painel',
      ownerId: input.ownerId,
      connectionId: input.connectionId,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .returning()
  if (!row) throw new Error('dashboard não inserido')
  return row
}

/** Insere uma equipe direto no banco com os membros dados. */
export async function createTeam(
  db: AppDatabase,
  input: { name?: string; memberIds?: string[] } = {},
) {
  const [row] = await db
    .insert(teams)
    .values({ name: input.name ?? 'Comercial' })
    .returning()
  if (!row) throw new Error('equipe não inserida')
  if (input.memberIds?.length) {
    await db
      .insert(teamMembers)
      .values(input.memberIds.map((userId) => ({ teamId: row.id, userId })))
  }
  return row
}

export type TestShareRecipient =
  | { type: 'USER'; userId: string }
  | { type: 'TEAM'; teamId: string }
  | { type: 'EVERYONE' }

/** Insere um compartilhamento direto no banco, sem passar pela rota. */
export async function createShare(
  db: AppDatabase,
  input: {
    dashboardId: string
    recipient: TestShareRecipient
    permission: 'view' | 'edit'
    createdBy: string
  },
) {
  const { recipient } = input
  const [row] = await db
    .insert(dashboardShares)
    .values({
      dashboardId: input.dashboardId,
      recipientType: recipient.type,
      userId: recipient.type === 'USER' ? recipient.userId : null,
      teamId: recipient.type === 'TEAM' ? recipient.teamId : null,
      recipientKey:
        recipient.type === 'USER'
          ? `user:${recipient.userId}`
          : recipient.type === 'TEAM'
            ? `team:${recipient.teamId}`
            : 'everyone',
      permission: input.permission,
      createdBy: input.createdBy,
    })
    .returning()
  if (!row) throw new Error('compartilhamento não inserido')
  return row
}
