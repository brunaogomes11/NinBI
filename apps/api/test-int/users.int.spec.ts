import { afterEach, describe, expect, it } from 'vitest'
import { PasswordHasher } from '../src/auth/password-hasher'
import { users } from '../src/database/schema'
import { createIntApp } from './harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('usuários no PostgreSQL real', () => {
  it('USR-13 criação simultânea com o mesmo e-mail cria um só', async () => {
    const test = await createIntApp()
    close = test.close
    await test.db.insert(users).values({
      name: 'Admin',
      email: 'admin@x.com',
      passwordHash: await new PasswordHasher().hash('senha-correta-123'),
      role: 'ADMIN',
    })
    const login = await test.http
      .post('/api/auth/login')
      .send({ email: 'admin@x.com', password: 'senha-correta-123' })
    expect(login.status).toBe(200)
    const cookie = login.headers['set-cookie']

    const create = () =>
      test
        .anonymous()
        .post('/api/users')
        .set('Cookie', cookie ?? [])
        .send({
          name: 'Bia',
          email: 'bia@x.com',
          role: 'VIEWER',
          temporaryPassword: 'provisoria-123',
        })
    const responses = await Promise.all([create(), create()])

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ])
    const loser = responses.find((response) => response.status === 409)
    expect(loser?.body.message).toBe('Já existe um usuário com este e-mail')
    const rows = await test.db.select().from(users)
    expect(rows.filter((row) => row.email === 'bia@x.com')).toHaveLength(1)
  })
})
