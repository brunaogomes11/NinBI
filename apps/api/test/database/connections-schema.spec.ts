import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  connectionSchemas,
  connections,
  schemaExampleOptOuts,
} from '../../src/database/schema'
import { createTestDb } from '../db'

const base = {
  uri: 'neo4j://h',
  username: 'neo4j',
  passwordEncrypted: 'v1:a:b:c',
} as const

describe('tabelas de conexões e schema', () => {
  it('CONN-22 índice lower(name) recusa Vendas depois de vendas', async () => {
    const { db, client } = await createTestDb()
    await db.insert(connections).values({ ...base, name: 'vendas' })
    await expect(
      db.insert(connections).values({ ...base, name: 'Vendas' }),
    ).rejects.toThrow()
    const all = await db.select().from(connections)
    expect(all.map((row) => row.name)).toEqual(['vendas'])
    await client.close()
  })

  it('CONN-18 apagar a conexão apaga o schema e as escolhas dela', async () => {
    const { db, client } = await createTestDb()
    const [vendas] = await db
      .insert(connections)
      .values({ ...base, name: 'Vendas' })
      .returning()
    const [outra] = await db
      .insert(connections)
      .values({ ...base, name: 'Outra' })
      .returning()
    for (const row of [vendas, outra]) {
      if (!row) throw new Error('conexão não criada')
      await db.insert(connectionSchemas).values({
        connectionId: row.id,
        readAt: new Date('2026-01-01T12:00:00Z'),
        document: { labels: [], relationshipTypes: [] },
      })
      await db.insert(schemaExampleOptOuts).values({
        connectionId: row.id,
        elementKind: 'LABEL',
        elementName: 'Cliente',
        propertyName: 'email',
      })
    }

    await db.delete(connections).where(eq(connections.id, vendas?.id ?? ''))

    const schemas = await db.select().from(connectionSchemas)
    const optOuts = await db.select().from(schemaExampleOptOuts)
    expect(schemas.map((row) => row.connectionId)).toEqual([outra?.id])
    expect(optOuts.map((row) => row.connectionId)).toEqual([outra?.id])
    await client.close()
  })

  it('CONN-18 conexão nova nasce com schema_status NEVER', async () => {
    const { db, client } = await createTestDb()
    const [row] = await db
      .insert(connections)
      .values({ ...base, name: 'Vendas' })
      .returning()
    expect(row?.schemaStatus).toBe('NEVER')
    expect(row?.database).toBeNull()
    expect(row?.schemaReadStartedAt).toBeNull()
    await client.close()
  })
})
