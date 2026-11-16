import type { Role } from '@ninbi/contracts'
import { PasswordHasher } from '../src/auth/password-hasher'
import type { CryptoService } from '../src/crypto/crypto.service'
import type { AppDatabase } from '../src/database/database.module'
import { connections, users } from '../src/database/schema'

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
  uri?: string
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
  const [row] = await db
    .insert(connections)
    .values({
      name: input.name ?? 'Vendas',
      uri: input.uri ?? 'neo4j://vendas.exemplo:7687',
      database: input.database ?? null,
      username: input.username ?? 'neo4j',
      passwordEncrypted: crypto.encrypt(input.password ?? 'segredo'),
    })
    .returning()
  if (!row) throw new Error('conexão não inserida')
  return row
}
