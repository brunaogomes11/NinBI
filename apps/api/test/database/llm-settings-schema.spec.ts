import { describe, expect, it } from 'vitest'
import { llmSettings } from '../../src/database/schema'
import { createTestDb } from '../db'

const base = {
  provider: 'OPENAI',
  model: 'gpt-4o',
  updatedAt: new Date('2026-01-01T12:00:00Z'),
} as const

describe('tabela da configuração do LLM', () => {
  it('LLM-03 tabela llm_settings aceita uma linha só', async () => {
    const { db, client } = await createTestDb()
    await db.insert(llmSettings).values({ ...base, id: 1 })
    await expect(
      db.insert(llmSettings).values({ ...base, id: 2 }),
    ).rejects.toThrow()
    await expect(
      db.insert(llmSettings).values({ ...base, id: 1 }),
    ).rejects.toThrow()
    const rows = await db.select().from(llmSettings)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.apiKeyEncrypted).toBeNull()
    expect(rows[0]?.apiKeyLast4).toBeNull()
    await client.close()
  })

  it('provedor fora do enum é recusado', async () => {
    const { db, client } = await createTestDb()
    await expect(
      db.insert(llmSettings).values({
        ...base,
        id: 1,
        provider: 'COHERE' as unknown as 'OPENAI',
      }),
    ).rejects.toThrow()
    await client.close()
  })
})
