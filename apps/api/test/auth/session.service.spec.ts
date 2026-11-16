import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SessionService } from '../../src/auth/session.service'
import { sessions, users } from '../../src/database/schema'
import { createTestDb } from '../db'
import { FakeClock } from '../harness'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

let ctx: Awaited<ReturnType<typeof createTestDb>>
let clock: FakeClock
let service: SessionService
let userId: string
let otherUserId: string

async function insertUser(email: string): Promise<string> {
  const [row] = await ctx.db
    .insert(users)
    .values({ name: 'Ana', email, passwordHash: 'hash', role: 'EDITOR' })
    .returning({ id: users.id })
  return row?.id as string
}

beforeEach(async () => {
  ctx = await createTestDb()
  clock = new FakeClock()
  service = new SessionService(ctx.db, clock)
  userId = await insertUser('ana@x.com')
  otherUserId = await insertUser('bruno@x.com')
})

afterEach(async () => {
  await ctx.client.close()
})

describe('SessionService', () => {
  it('AUTH-09 sessão usada há 6 dias e 23 h resolve', async () => {
    const { token } = await service.create(userId)
    clock.advance(6 * DAY + 23 * HOUR)
    const user = await service.resolve(token)
    expect(user).toEqual({
      id: userId,
      name: 'Ana',
      email: 'ana@x.com',
      role: 'EDITOR',
      mustChangePassword: false,
    })
  })

  it('AUTH-09 sessão sem uso há 7 dias e 1 min não resolve', async () => {
    const { token } = await service.create(userId)
    clock.advance(7 * DAY + MINUTE)
    expect(await service.resolve(token)).toBeNull()
  })

  it('AUTH-09 o uso renova o prazo de 7 dias', async () => {
    const { token } = await service.create(userId)
    clock.advance(6 * DAY)
    expect(await service.resolve(token)).not.toBeNull()
    clock.advance(6 * DAY)
    expect(await service.resolve(token)).not.toBeNull()
    clock.advance(7 * DAY + MINUTE)
    expect(await service.resolve(token)).toBeNull()
  })

  it('AUTH-09 token desconhecido não resolve', async () => {
    expect(await service.resolve('nao-existe')).toBeNull()
  })

  it('AUTH-10 o banco guarda só o sha256 do token, nunca o texto', async () => {
    const { token } = await service.create(userId)
    const rows = await ctx.db.select().from(sessions)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    )
    expect(rows[0]?.tokenHash).not.toBe(token)
    expect(JSON.stringify(rows)).not.toContain(token)
  })

  it('AUTH-12 usuário desativado não resolve', async () => {
    const { token } = await service.create(userId)
    await ctx.db
      .update(users)
      .set({ status: 'DISABLED' })
      .where(eq(users.id, userId))
    expect(await service.resolve(token)).toBeNull()
  })

  it('AUTH-06 revoke apaga só a sessão informada', async () => {
    const first = await service.create(userId)
    const second = await service.create(userId)
    await service.revoke(first.token)
    expect(await service.resolve(first.token)).toBeNull()
    expect(await service.resolve(second.token)).not.toBeNull()
  })

  it('USR-07 revokeAllForUser derruba todas as sessões do usuário e só as dele', async () => {
    const a = await service.create(userId)
    const b = await service.create(userId)
    const other = await service.create(otherUserId)
    await service.revokeAllForUser(userId)
    expect(await service.resolve(a.token)).toBeNull()
    expect(await service.resolve(b.token)).toBeNull()
    expect(await service.resolve(other.token)).not.toBeNull()
  })
})
