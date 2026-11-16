import type { Role } from '@ninbi/contracts'
import { PasswordHasher } from '../src/auth/password-hasher'
import type { AppDatabase } from '../src/database/database.module'
import { users } from '../src/database/schema'

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
