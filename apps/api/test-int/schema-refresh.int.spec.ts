import { afterEach, describe, expect, it } from 'vitest'
import { PasswordHasher } from '../src/auth/password-hasher'
import { CryptoService } from '../src/crypto/crypto.service'
import { connections, users } from '../src/database/schema'
import { SchemaRefreshService } from '../src/schema/schema-refresh.service'
import { createIntApp } from './harness'

let current: Awaited<ReturnType<typeof createIntApp>> | undefined

afterEach(async () => {
  current?.neo4j.release()
  await current?.close()
  current = undefined
})

describe('leitura do schema no PostgreSQL real', () => {
  it('SCH-11 pedidos simultâneos iniciam uma leitura só', async () => {
    const test = await createIntApp()
    current = test
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
    const crypto = test.app.get(CryptoService)
    const [connection] = await test.db
      .insert(connections)
      .values({
        name: 'Vendas',
        uri: 'neo4j://vendas.exemplo:7687',
        username: 'neo4j',
        passwordEncrypted: crypto.encrypt('segredo'),
      })
      .returning()
    if (!connection) throw new Error('conexão não inserida')
    test.neo4j.whenRead('db.schema.nodeTypeProperties', 'hang')

    const refresh = () =>
      test
        .anonymous()
        .post(`/api/connections/${connection.id}/schema/refresh`)
        .set('Cookie', cookie ?? [])
    const responses = await Promise.all([refresh(), refresh()])

    expect(responses.map((r) => r.status)).toEqual([202, 202])
    expect(responses.map((r) => r.body.status)).toEqual(['READING', 'READING'])
    const reads = test.neo4j.calls.filter(
      (call) =>
        call.method === 'read' && call.cypher?.includes('nodeTypeProperties'),
    )
    expect(reads).toHaveLength(1)

    test.neo4j.release()
    await test.app.get(SchemaRefreshService).whenSettled(connection.id)
  })
})
