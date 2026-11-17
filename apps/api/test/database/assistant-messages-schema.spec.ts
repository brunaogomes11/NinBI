import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  assistantMessages,
  connections,
  dashboards,
  users,
} from '../../src/database/schema'
import { createTestDb } from '../db'

async function seed() {
  const { db, client } = await createTestDb()
  const [user] = await db
    .insert(users)
    .values({
      name: 'Ana',
      email: 'ana@x.com',
      passwordHash: 'x',
      role: 'EDITOR',
    })
    .returning()
  const [connection] = await db
    .insert(connections)
    .values({
      name: 'Vendas',
      uri: 'neo4j://h',
      username: 'neo4j',
      passwordEncrypted: 'v1:a:b:c',
    })
    .returning()
  if (!user || !connection) throw new Error('seed falhou')
  const [dashboard] = await db
    .insert(dashboards)
    .values({ name: 'Painel', ownerId: user.id, connectionId: connection.id })
    .returning()
  if (!dashboard) throw new Error('seed falhou')
  return { db, client, user, dashboard }
}

describe('tabela da conversa do assistente', () => {
  it('migrações aplicam no PGlite', async () => {
    const { db, client } = await createTestDb()
    expect(await db.select().from(assistantMessages)).toEqual([])
    await client.close()
  })

  it('HIST-01 tabela assistant_messages guarda mensagens por dashboard e usuário', async () => {
    const { db, client, user, dashboard } = await seed()
    const createdAt = new Date('2026-01-01T12:00:00Z')
    const base = { dashboardId: dashboard.id, userId: user.id, createdAt }
    await db
      .insert(assistantMessages)
      .values({ ...base, role: 'USER', text: 'primeira' })
    await db.insert(assistantMessages).values({
      ...base,
      role: 'ASSISTANT',
      text: 'segunda',
      details: {
        changes: ['Aba criada: Vendas'],
        notApplied: [],
        createdWidgets: 0,
        failedWidgets: [],
        discardedWidgets: 0,
      },
    })

    const rows = await db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.dashboardId, dashboard.id))
      .orderBy(assistantMessages.seq)
    expect(rows.map((row) => row.text)).toEqual(['primeira', 'segunda'])
    expect(rows[0]?.details).toBeNull()
    expect(rows[1]?.details?.changes).toEqual(['Aba criada: Vendas'])
    expect(Number(rows[1]?.seq)).toBeGreaterThan(Number(rows[0]?.seq))

    await expect(
      db.insert(assistantMessages).values({
        ...base,
        role: 'SYSTEM' as unknown as 'USER',
        text: 'x',
      }),
    ).rejects.toThrow()
    await expect(
      db.insert(assistantMessages).values({
        ...base,
        dashboardId: '00000000-0000-4000-8000-000000000999',
        role: 'USER',
        text: 'x',
      }),
    ).rejects.toThrow()
    await client.close()
  })
})
