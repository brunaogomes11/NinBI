import type { INestApplication } from '@nestjs/common'
import type { Role } from '@ninbi/contracts'
import request from 'supertest'
import { expect } from 'vitest'
import type { AppDatabase } from '../../src/database/database.module'
import { createUser } from '../factories'

export const TEST_PASSWORD = 'senha-correta-123'

/** Cria um usuário no banco e devolve o usuário e um agente já autenticado como ele. */
export async function signInAs(
  app: INestApplication,
  db: AppDatabase,
  role: Role,
  email = `${role.toLowerCase()}@x.com`,
) {
  const user = await createUser(db, { name: email, email, role })
  const agent = request.agent(app.getHttpServer())
  const login = await agent
    .post('/api/auth/login')
    .send({ email, password: TEST_PASSWORD })
  expect(login.status).toBe(200)
  return { user, agent }
}
