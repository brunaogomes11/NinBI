import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LoginThrottleService } from '../../src/auth/login-throttle.service'
import { createTestDb } from '../db'
import { FakeClock } from '../harness'

const SECOND = 1000
const MINUTE = 60 * SECOND

let ctx: Awaited<ReturnType<typeof createTestDb>>
let clock: FakeClock
let service: LoginThrottleService

async function fail(times: number, email = 'ana@x.com') {
  for (let i = 0; i < times; i++) await service.registerFailure(email)
}

beforeEach(async () => {
  ctx = await createTestDb()
  clock = new FakeClock()
  service = new LoginThrottleService(ctx.db, clock)
})

afterEach(async () => {
  await ctx.client.close()
})

describe('LoginThrottleService', () => {
  it('AUTH-04 throttle: 4 falhas não bloqueiam', async () => {
    await fail(4)
    expect(await service.isLocked('ana@x.com')).toBe(false)
  })

  it('AUTH-04 throttle: a 5ª falha em 15 min bloqueia', async () => {
    await fail(5)
    expect(await service.isLocked('ana@x.com')).toBe(true)
  })

  it('AUTH-04 throttle: continua bloqueado aos 14 min 59 s', async () => {
    await fail(5)
    clock.advance(14 * MINUTE + 59 * SECOND)
    expect(await service.isLocked('ana@x.com')).toBe(true)
  })

  it('AUTH-04 throttle: libera aos 15 min', async () => {
    await fail(5)
    clock.advance(15 * MINUTE)
    expect(await service.isLocked('ana@x.com')).toBe(false)
  })

  it('AUTH-04 throttle: falhas espalhadas por mais de 15 min não bloqueiam', async () => {
    await fail(4)
    clock.advance(15 * MINUTE + SECOND)
    await fail(1)
    expect(await service.isLocked('ana@x.com')).toBe(false)
    await fail(3)
    expect(await service.isLocked('ana@x.com')).toBe(false)
  })

  it('AUTH-04 throttle: ANA@x.com e ana@x.com contam juntos', async () => {
    await fail(2, 'ANA@x.com')
    await fail(3, 'ana@x.com')
    expect(await service.isLocked('Ana@X.com')).toBe(true)
  })

  it('AUTH-04 throttle: reset limpa as falhas', async () => {
    await fail(4)
    await service.reset('ana@x.com')
    await fail(1)
    expect(await service.isLocked('ana@x.com')).toBe(false)
  })

  it('AUTH-04 throttle: outro e-mail não é afetado', async () => {
    await fail(5)
    expect(await service.isLocked('bruno@x.com')).toBe(false)
  })
})
