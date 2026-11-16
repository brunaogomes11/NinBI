import { afterEach, describe, expect, it } from 'vitest'
import { users } from '../src/database/schema'
import { createIntApp } from './harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('primeiro administrador no PostgreSQL real', () => {
  it('SETUP-06 dois envios simultâneos criam um único admin e um recebe 409', async () => {
    const test = await createIntApp()
    close = test.close
    const body = (email: string) => ({
      name: 'Admin',
      email,
      password: 'senha-forte-123',
      confirmPassword: 'senha-forte-123',
    })
    const responses = await Promise.all([
      test.anonymous().post('/api/setup/admin').send(body('a@x.com')),
      test.anonymous().post('/api/setup/admin').send(body('b@x.com')),
    ])
    const statuses = responses.map((response) => response.status).sort()
    expect(statuses).toEqual([201, 409])
    const loser = responses.find((response) => response.status === 409)
    expect(loser?.body.code).toBe('SETUP_ALREADY_DONE')
    const rows = await test.db.select().from(users)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.role).toBe('ADMIN')
  })
})
