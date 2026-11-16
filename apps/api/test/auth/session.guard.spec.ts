import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { users } from '../../src/database/schema'
import { createUser, type TestUserInput } from '../factories'
import { createTestApp } from '../harness'
import { ProbeController } from '../support/probe.controller'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
const PASSWORD = 'senha-correta-123'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup(userInput?: TestUserInput) {
  const test = await createTestApp({ controllers: [ProbeController] })
  close = test.close
  const user = await createUser(test.db, userInput)
  return { ...test, user }
}

async function login(test: Awaited<ReturnType<typeof setup>>) {
  const response = await test.http
    .post('/api/auth/login')
    .send({ email: test.user.email, password: PASSWORD })
  expect(response.status).toBe(200)
}

describe('SessionGuard', () => {
  it('AUTH-07 rota protegida sem sessão válida responde 401', async () => {
    const test = await setup()
    const anonymous = await request(test.app.getHttpServer()).get('/api/probe')
    expect(anonymous.status).toBe(401)
    expect(anonymous.body.code).toBe('UNAUTHENTICATED')
    const forged = await request(test.app.getHttpServer())
      .get('/api/probe')
      .set('Cookie', 'ninbi_session=token-forjado')
    expect(forged.status).toBe(401)
    expect(forged.body.code).toBe('UNAUTHENTICATED')
  })

  it('AUTH-07 rotas públicas seguem abertas sem sessão', async () => {
    const test = await setup()
    const health = await request(test.app.getHttpServer()).get('/api/health')
    expect(health.status).toBe(200)
    const loginAttempt = await request(test.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    expect(loginAttempt.status).toBe(200)
  })

  it('AUTH-09 sessão sem uso por 7 dias é inválida', async () => {
    const test = await setup()
    await login(test)
    expect((await test.http.get('/api/probe')).status).toBe(200)
    test.clock.advance(7 * DAY + MINUTE)
    const expired = await test.http.get('/api/probe')
    expect(expired.status).toBe(401)
    expect(expired.body.code).toBe('UNAUTHENTICATED')
  })

  it('AUTH-09 cada uso reemite o cookie com 7 dias de prazo', async () => {
    const test = await setup()
    await login(test)
    test.clock.advance(3 * DAY)
    const response = await test.http.get('/api/probe')
    expect(response.status).toBe(200)
    const cookies = response.headers['set-cookie'] as unknown as string[]
    const cookie = cookies.find((item) => item.startsWith('ninbi_session='))
    expect(cookie).toContain(`Max-Age=${(7 * DAY) / 1000}`)
    expect(cookie).toContain('HttpOnly')
    test.clock.advance(6 * DAY)
    expect((await test.http.get('/api/probe')).status).toBe(200)
  })

  it('USR-15 usuário desativado com sessão aberta recebe 401', async () => {
    const test = await setup()
    await login(test)
    expect((await test.http.get('/api/probe')).status).toBe(200)
    await test.db
      .update(users)
      .set({ status: 'DISABLED' })
      .where(eq(users.id, test.user.id))
    const response = await test.http.get('/api/probe')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('UNAUTHENTICATED')
  })

  it('ROLE-05 novo papel vale na próxima requisição', async () => {
    const test = await setup({ role: 'EDITOR' })
    await login(test)
    expect((await test.http.get('/api/auth/me')).body.role).toBe('EDITOR')
    await test.db
      .update(users)
      .set({ role: 'VIEWER' })
      .where(eq(users.id, test.user.id))
    const me = await test.http.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.role).toBe('VIEWER')
  })

  it('USR-06 senha provisória bloqueia outras rotas e libera me', async () => {
    const test = await setup({ mustChangePassword: true })
    await login(test)
    const blocked = await test.http.get('/api/probe')
    expect(blocked.status).toBe(403)
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED')
    const me = await test.http.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.mustChangePassword).toBe(true)
    const logout = await test.http.post('/api/auth/logout')
    expect(logout.status).toBe(204)
  })
})
