import { afterEach, describe, expect, it } from 'vitest'
import type { AppDatabase } from '../../src/database/database.module'
import { createTestApp } from '../harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('health', () => {
  it('FND-03 health responde 200 com postgres up', async () => {
    const test = await createTestApp()
    close = test.close
    const response = await test.http.get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', postgres: 'up' })
  })

  it('FND-04 health responde 503 com postgres down', async () => {
    const brokenDb = {
      execute: async () => {
        throw new Error('connection refused')
      },
    } as unknown as AppDatabase
    const test = await createTestApp({ db: brokenDb })
    close = test.close
    const response = await test.http.get('/api/health')
    expect(response.status).toBe(503)
    expect(response.body).toEqual({ status: 'error', postgres: 'down' })
  })
})
