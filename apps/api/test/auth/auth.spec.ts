import { eq } from 'drizzle-orm'
import request, { type Response } from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { users } from '../../src/database/schema'
import { createUser } from '../factories'
import { createTestApp } from '../harness'

const MINUTE = 60 * 1000
const PASSWORD = 'senha-correta-123'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp()
  close = test.close
  return test
}

function sessionCookie(response: Response): string {
  const header = response.headers['set-cookie'] as unknown as string[]
  const cookie = header.find((item) => item.startsWith('ninbi_session='))
  if (!cookie) throw new Error('sem cookie de sessão')
  return cookie
}

describe('cadastro público', () => {
  const account = {
    name: 'Bia',
    email: 'bia@x.com',
  }

  it('preserva o primeiro acesso da instalação', async () => {
    const test = await setup()
    const response = await test.http.post('/api/auth/register').send(account)
    expect(response.status).toBe(409)
    expect(await test.db.select().from(users)).toEqual([])
    expect((await test.http.get('/api/setup/status')).body).toEqual({
      needsSetup: true,
    })
  })

  it('cria um Visualizador pendente que só entra após a aprovação do Admin', async () => {
    const test = await setup()
    const admin = await createUser(test.db, { role: 'ADMIN' })
    const guest = request.agent(test.app.getHttpServer())
    const registered = await guest
      .post('/api/auth/register')
      .send({ ...account, role: 'ADMIN', status: 'ACTIVE', password: PASSWORD })
    expect(registered.status).toBe(204)
    expect(registered.headers['set-cookie']).toBeUndefined()

    const credentials = { email: account.email, password: PASSWORD }
    expect((await guest.post('/api/auth/login').send(credentials)).status).toBe(
      401,
    )
    await test.http
      .post('/api/auth/login')
      .send({ email: admin.email, password: PASSWORD })
      .expect(200)
    const list = await test.http.get('/api/users').expect(200)
    const pending = list.body.find(
      (user: { email: string }) => user.email === account.email,
    )
    expect(pending).toMatchObject({
      name: account.name,
      role: 'VIEWER',
      status: 'PENDING',
    })
    await test.http.post(`/api/users/${pending.id}/deactivate`).expect(409)
    await test.http.post(`/api/users/${pending.id}/reactivate`).expect(409)
    const approval = `/api/users/${pending.id}/approve-registration`
    const temporaryPassword = 'provisoria-123'
    await guest.post(approval).send({ temporaryPassword }).expect(401)
    await test.http.post(approval).send({ temporaryPassword }).expect(200)
    await test.http
      .post(approval)
      .send({ temporaryPassword: 'outra-senha-123' })
      .expect(409)
    await guest.post('/api/auth/login').send(credentials).expect(401)
    const login = await guest
      .post('/api/auth/login')
      .send({ email: account.email, password: temporaryPassword })
      .expect(200)
    expect(login.body).toMatchObject({
      id: pending.id,
      role: 'VIEWER',
      mustChangePassword: true,
    })
  })

  it('mantém a conta existente quando o e-mail coincide sem distinção de maiúsculas', async () => {
    const test = await setup()
    const admin = await createUser(test.db, {
      email: account.email,
      role: 'ADMIN',
    })
    await test.http
      .post('/api/auth/register')
      .send({
        ...account,
        email: account.email.toUpperCase(),
      })
      .expect(204)
    expect(await test.db.select().from(users)).toEqual([admin])
  })
})

describe('login, logout e sessão atual', () => {
  it('AUTH-01 login correto cria a sessão', async () => {
    const test = await setup()
    const user = await createUser(test.db)
    const login = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    expect(login.status).toBe(200)
    expect(login.body).toEqual({
      id: user.id,
      name: 'Ana',
      email: 'ana@x.com',
      role: 'EDITOR',
      mustChangePassword: false,
    })
    const me = await test.http.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body).toEqual(login.body)
  })

  it('AUTH-02 e-mail inexistente e senha errada dão a mesma resposta', async () => {
    const test = await setup()
    await createUser(test.db)
    const unknown = await test.http
      .post('/api/auth/login')
      .send({ email: 'ninguem@x.com', password: PASSWORD })
    const wrong = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: 'senha-errada-123' })
    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(unknown.body).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos',
    })
    expect(wrong.body).toEqual(unknown.body)
  })

  it('AUTH-04 cinco erros em 15 minutos bloqueiam o e-mail por 15 minutos', async () => {
    const test = await setup()
    await createUser(test.db)
    for (let i = 0; i < 5; i++) {
      const failed = await test.http
        .post('/api/auth/login')
        .send({ email: 'ana@x.com', password: 'senha-errada-123' })
      expect(failed.status).toBe(401)
    }
    const locked = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    expect(locked.status).toBe(429)
    expect(locked.body).toEqual({
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Muitas tentativas. Tente novamente em 15 minutos.',
    })
    test.clock.advance(15 * MINUTE)
    const released = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    expect(released.status).toBe(200)
  })

  it('AUTH-06 logout encerra a sessão', async () => {
    const test = await setup()
    await createUser(test.db)
    const login = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    const cookie = sessionCookie(login)
    const logout = await request(test.app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
    expect(logout.status).toBe(204)
    const me = await request(test.app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
    expect(me.status).toBe(401)
    expect(me.body.code).toBe('UNAUTHENTICATED')
  })

  it('AUTH-10 guarda só o hash com sal da senha', async () => {
    const test = await setup()
    await createUser(test.db)
    await createUser(test.db, { name: 'Bruno', email: 'bruno@x.com' })
    const rows = await test.db.select().from(users)
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.passwordHash).not.toContain(PASSWORD)
      expect(row.passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$.+\$.+$/)
    }
    expect(rows[0]?.passwordHash).not.toBe(rows[1]?.passwordHash)
  })

  it('AUTH-11 cookie de sessão é httpOnly', async () => {
    const test = await setup()
    await createUser(test.db)
    const login = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    const cookie = sessionCookie(login)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
  })

  it('AUTH-12 usuário desativado recebe E-mail ou senha incorretos', async () => {
    const test = await setup()
    await createUser(test.db)
    await test.db
      .update(users)
      .set({ status: 'DISABLED' })
      .where(eq(users.email, 'ana@x.com'))
    const login = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: PASSWORD })
    expect(login.status).toBe(401)
    expect(login.body.message).toBe('E-mail ou senha incorretos')
  })

  it('AUTH-03 corpo inválido responde 400 com a mensagem no campo', async () => {
    const test = await setup()
    const response = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@', password: '' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(response.body.fieldErrors).toEqual({
      email: 'Informe um e-mail válido',
      password: 'Informe a senha',
    })
  })
})
