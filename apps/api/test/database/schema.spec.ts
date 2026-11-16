import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { users } from '../../src/database/schema'
import { createTestDb } from '../db'

const baseUser = {
  name: 'Ana',
  passwordHash: 'hash',
  role: 'ADMIN',
} as const

describe('schema do banco', () => {
  it('USR-13 migrações aplicam e criam as tabelas da fundação, das conexões e dos dashboards', async () => {
    const { db, client } = await createTestDb()
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    )
    const names = rows.rows
      .map((row) => row.table_name)
      .filter((name) => !name.startsWith('__'))
    expect(names).toEqual([
      'connection_schemas',
      'connections',
      'dashboard_tabs',
      'dashboards',
      'installation',
      'login_throttle',
      'schema_example_opt_outs',
      'sessions',
      'sidebar_layouts',
      'users',
      'widgets',
    ])
    await client.close()
  })

  it('USR-05 índice lower(email) recusa Ana@x.com depois de ana@x.com', async () => {
    const { db, client } = await createTestDb()
    await db.insert(users).values({ ...baseUser, email: 'ana@x.com' })
    await expect(
      db.insert(users).values({ ...baseUser, email: 'Ana@x.com' }),
    ).rejects.toThrow()
    const all = await db.select().from(users)
    expect(all).toHaveLength(1)
    expect(all[0]?.email).toBe('ana@x.com')
    await client.close()
  })

  it('USR-13 e-mails diferentes convivem e a situação padrão é ACTIVE', async () => {
    const { db, client } = await createTestDb()
    await db.insert(users).values({ ...baseUser, email: 'ana@x.com' })
    await db.insert(users).values({ ...baseUser, email: 'bruno@x.com' })
    const all = await db.select().from(users)
    expect(all.map((u) => u.status)).toEqual(['ACTIVE', 'ACTIVE'])
    expect(all.map((u) => u.mustChangePassword)).toEqual([false, false])
    await client.close()
  })
})
