import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  connections,
  dashboards,
  dashboardTabs,
  sidebarLayouts,
  users,
  widgets,
} from '../../src/database/schema'
import { createTestDb } from '../db'

async function seed() {
  const { db, client } = await createTestDb()
  const [owner] = await db
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
  if (!owner || !connection) throw new Error('seed falhou')
  const [dashboard] = await db
    .insert(dashboards)
    .values({ name: 'Painel', ownerId: owner.id, connectionId: connection.id })
    .returning()
  if (!dashboard) throw new Error('dashboard não criado')
  const [tab] = await db
    .insert(dashboardTabs)
    .values({
      id: crypto.randomUUID(),
      dashboardId: dashboard.id,
      name: 'Aba 1',
      position: 0,
    })
    .returning()
  if (!tab) throw new Error('aba não criada')
  return { db, client, owner, connection, dashboard, tab }
}

describe('tabelas de dashboards', () => {
  it('migrações aplicam no PGlite e criam as quatro tabelas', async () => {
    const { db, client, owner } = await seed()
    await db.insert(sidebarLayouts).values({
      userId: owner.id,
      layout: { items: [] },
      updatedAt: new Date('2026-01-01T12:00:00Z'),
    })
    const [row] = await db.select().from(sidebarLayouts)
    expect(row?.layout).toEqual({ items: [] })
    await client.close()
  })

  it('dashboard novo nasce com version 1', async () => {
    const { client, dashboard } = await seed()
    expect(dashboard.version).toBe(1)
    await client.close()
  })

  it('GRID-06 um widget guarda x, y, w, h e tab_id', async () => {
    const { db, client, dashboard, tab } = await seed()
    const [widget] = await db
      .insert(widgets)
      .values({
        id: crypto.randomUUID(),
        dashboardId: dashboard.id,
        tabId: tab.id,
        title: 'Lojas',
        x: 4,
        y: 1,
        w: 6,
        h: 3,
      })
      .returning()
    expect(widget).toMatchObject({ x: 4, y: 1, w: 6, h: 3, tabId: tab.id })
    await client.close()
  })

  it('widgets.visualization padrão é TABLE e config padrão é {}', async () => {
    const { db, client, dashboard, tab } = await seed()
    const [widget] = await db
      .insert(widgets)
      .values({
        id: crypto.randomUUID(),
        dashboardId: dashboard.id,
        tabId: tab.id,
        title: 'Lojas',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
      })
      .returning()
    expect(widget?.visualization).toBe('TABLE')
    expect(widget?.config).toEqual({})
    expect(widget?.cypher).toBeNull()
    await client.close()
  })

  it('DASH-11 apagar o dashboard apaga as abas e os widgets dele', async () => {
    const { db, client, dashboard, tab } = await seed()
    await db.insert(widgets).values({
      id: crypto.randomUUID(),
      dashboardId: dashboard.id,
      tabId: tab.id,
      title: 'Lojas',
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    })
    await db.delete(dashboards).where(eq(dashboards.id, dashboard.id))
    expect(await db.select().from(dashboardTabs)).toEqual([])
    expect(await db.select().from(widgets)).toEqual([])
    await client.close()
  })

  it('DASH-14 chave estrangeira impede apagar conexão usada', async () => {
    const { db, client, connection } = await seed()
    await expect(
      db.delete(connections).where(eq(connections.id, connection.id)),
    ).rejects.toThrow()
    const remaining = await db.select().from(connections)
    expect(remaining.map((row) => row.id)).toEqual([connection.id])
    await client.close()
  })
})
