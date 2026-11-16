import { afterEach, describe, expect, it } from 'vitest'
import { PasswordHasher } from '../src/auth/password-hasher'
import { connections, users } from '../src/database/schema'
import { createIntApp } from './harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('conexões no PostgreSQL real', () => {
  it('CONN-22 criação simultânea com o mesmo nome salva uma só', async () => {
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
        .post('/api/connections')
        .set('Cookie', cookie ?? [])
        .send({
          name: 'Vendas',
          uri: 'neo4j://vendas.exemplo:7687',
          database: '',
          username: 'neo4j',
          password: 'segredo',
        })
    const responses = await Promise.all([create(), create()])

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409])
    const rejected = responses.find((r) => r.status === 409)
    expect(rejected?.body).toMatchObject({
      code: 'CONNECTION_NAME_TAKEN',
      fieldErrors: { name: 'Já existe uma conexão com este nome' },
    })
    expect(await test.db.select().from(connections)).toHaveLength(1)
  })
})
