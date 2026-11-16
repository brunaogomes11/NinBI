import type { DashboardSharesDto } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { PasswordHasher } from '../src/auth/password-hasher'
import {
  connections,
  dashboardShares,
  dashboards,
  users,
} from '../src/database/schema'
import { createIntApp } from './harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('compartilhamentos no PostgreSQL real', () => {
  it('SHARE-17 dois envios simultâneos do mesmo destinatário deixam uma linha', async () => {
    const test = await createIntApp()
    close = test.close
    const passwordHash = await new PasswordHasher().hash('senha-correta-123')
    const [owner, guest] = await test.db
      .insert(users)
      .values([
        { name: 'Ana', email: 'ana@x.com', passwordHash, role: 'EDITOR' },
        { name: 'Bia', email: 'bia@x.com', passwordHash, role: 'EDITOR' },
      ])
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
    if (!owner || !guest || !connection) throw new Error('seed falhou')
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

    const arrivals: ('view' | 'edit')[] = []
    const send = async (permission: 'view' | 'edit') => {
      const res = await test
        .anonymous()
        .post(`/api/dashboards/${dashboard.id}/shares`)
        .set('Cookie', cookie)
        .send({ recipient: { type: 'USER', userId: guest.id }, permission })
      arrivals.push(
        (res.body as DashboardSharesDto).shares[0]?.permission ?? permission,
      )
      return res
    }
    const [first, second] = await Promise.all([send('view'), send('edit')])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const rows = await test.db
      .select()
      .from(dashboardShares)
      .where(eq(dashboardShares.dashboardId, dashboard.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.permission).toBe(arrivals.at(-1))
  })
})
