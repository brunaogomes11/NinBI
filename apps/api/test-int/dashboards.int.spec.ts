import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { PasswordHasher } from '../src/auth/password-hasher'
import { connections, dashboards, users } from '../src/database/schema'
import { createIntApp } from './harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('dashboards no PostgreSQL real', () => {
  it('EDIT-04 duas gravações simultâneas da mesma versão dão um 200 e um 409', async () => {
    const test = await createIntApp()
    close = test.close
    const [owner] = await test.db
      .insert(users)
      .values({
        name: 'Ana',
        email: 'ana@x.com',
        passwordHash: await new PasswordHasher().hash('senha-correta-123'),
        role: 'EDITOR',
      })
      .returning()
    const [connection] = await test.db
      .insert(connections)
      .values({
        name: 'Vendas',
        uri: 'neo4j://h',
        username: 'neo4j',
        passwordEncrypted: 'v1:a:b:c',
      })
      .returning()
    if (!owner || !connection) throw new Error('seed falhou')
    const [dashboard] = await test.db
      .insert(dashboards)
      .values({
        name: 'Painel',
        ownerId: owner.id,
        connectionId: connection.id,
      })
      .returning()
    if (!dashboard) throw new Error('dashboard não criado')

    const login = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: 'senha-correta-123' })
    expect(login.status).toBe(200)
    const cookie = login.headers['set-cookie'] ?? []

    const save = (name: string, tabId: string) =>
      request(test.app.getHttpServer())
        .put(`/api/dashboards/${dashboard.id}`)
        .set('Cookie', cookie)
        .send({
          version: 1,
          name,
          connectionId: connection.id,
          tabs: [{ id: tabId, name: 'Aba 1', widgets: [] }],
        })
    const responses = await Promise.all([
      save('Primeiro', '00000000-0000-4000-8000-000000000001'),
      save('Segundo', '00000000-0000-4000-8000-000000000002'),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ])
    const loser = responses.find((response) => response.status === 409)
    expect(loser?.body.code).toBe('DASHBOARD_VERSION_CONFLICT')
    const winner = responses.find((response) => response.status === 200)
    const [row] = await test.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, dashboard.id))
    expect(row?.version).toBe(2)
    expect(row?.name).toBe(winner?.body.name)
  })
})
