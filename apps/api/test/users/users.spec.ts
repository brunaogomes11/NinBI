import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createUser } from '../factories'
import { createTestApp } from '../harness'

const PASSWORD = 'senha-correta-123'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setupAdmin() {
  const test = await createTestApp()
  close = test.close
  await createUser(test.db, {
    name: 'Admin',
    email: 'admin@x.com',
    role: 'ADMIN',
  })
  const login = await test.http
    .post('/api/auth/login')
    .send({ email: 'admin@x.com', password: PASSWORD })
  expect(login.status).toBe(200)
  return test
}

describe('listar e criar usuários', () => {
  it('USR-01 lista em ordem alfabética de nome com e-mail, papel e situação', async () => {
    const test = await setupAdmin()
    await createUser(test.db, { name: 'bruno', email: 'bruno@x.com' })
    await createUser(test.db, {
      name: 'Carla',
      email: 'carla@x.com',
      role: 'VIEWER',
      status: 'DISABLED',
    })
    await createUser(test.db, { name: 'Ana', email: 'ana@x.com' })

    const response = await test.http.get('/api/users')
    expect(response.status).toBe(200)
    const rows = response.body as Array<Record<string, unknown>>
    expect(rows.map((row) => row.name)).toEqual([
      'Admin',
      'Ana',
      'bruno',
      'Carla',
    ])
    expect(rows[1]).toMatchObject({
      name: 'Ana',
      email: 'ana@x.com',
      role: 'EDITOR',
      status: 'ACTIVE',
    })
    expect(rows[3]).toMatchObject({
      name: 'Carla',
      email: 'carla@x.com',
      role: 'VIEWER',
      status: 'DISABLED',
    })
    expect(rows[1]).not.toHaveProperty('passwordHash')
  })

  it('USR-04 cria usuário com senha provisória', async () => {
    const test = await setupAdmin()
    const created = await test.http.post('/api/users').send({
      name: 'Bia',
      email: 'bia@x.com',
      role: 'VIEWER',
      temporaryPassword: 'provisoria-123',
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      name: 'Bia',
      email: 'bia@x.com',
      role: 'VIEWER',
      status: 'ACTIVE',
    })
    expect(created.body).not.toHaveProperty('passwordHash')

    const list = await test.http.get('/api/users')
    const bia = (list.body as Array<Record<string, unknown>>).find(
      (row) => row.email === 'bia@x.com',
    )
    expect(bia).toMatchObject({ id: created.body.id, mustChangePassword: true })

    const login = await request(test.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bia@x.com', password: 'provisoria-123' })
    expect(login.status).toBe(200)
    expect(login.body.mustChangePassword).toBe(true)
  })

  it('USR-05 e-mail repetido sem diferenciar maiúsculas responde 409', async () => {
    const test = await setupAdmin()
    const body = {
      name: 'Ana',
      role: 'EDITOR',
      temporaryPassword: 'provisoria-123',
    }
    const first = await test.http
      .post('/api/users')
      .send({ ...body, email: 'ana@x.com' })
    expect(first.status).toBe(201)
    const second = await test.http
      .post('/api/users')
      .send({ ...body, email: 'ANA@x.com' })
    expect(second.status).toBe(409)
    expect(second.body.code).toBe('EMAIL_TAKEN')
    expect(second.body.message).toBe('Já existe um usuário com este e-mail')
  })

  it('USR-14 nome ou e-mail acima de 120 caracteres são recusados', async () => {
    const test = await setupAdmin()
    const base = {
      name: 'Ana',
      email: 'ana@x.com',
      role: 'EDITOR',
      temporaryPassword: 'provisoria-123',
    }
    const longName = await test.http
      .post('/api/users')
      .send({ ...base, name: 'a'.repeat(121) })
    expect(longName.status).toBe(400)
    expect(longName.body.fieldErrors.name).toBe(
      'O nome pode ter no máximo 120 caracteres',
    )
    const longEmail = await test.http
      .post('/api/users')
      .send({ ...base, email: `${'a'.repeat(115)}@x.com` })
    expect(longEmail.status).toBe(400)
    expect(longEmail.body.fieldErrors.email).toBe(
      'O e-mail pode ter no máximo 120 caracteres',
    )
  })

  it('ROLE-02 Editor e Visualizador recebem 403 na API de usuários', async () => {
    const test = await createTestApp()
    close = test.close
    await createUser(test.db, { email: 'editor@x.com', role: 'EDITOR' })
    await createUser(test.db, { email: 'viewer@x.com', role: 'VIEWER' })
    for (const email of ['editor@x.com', 'viewer@x.com']) {
      const agent = request.agent(test.app.getHttpServer())
      const login = await agent
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
      expect(login.status).toBe(200)
      expect((await agent.get('/api/users')).status).toBe(403)
      const post = await agent.post('/api/users').send({
        name: 'Bia',
        email: 'bia@x.com',
        role: 'VIEWER',
        temporaryPassword: 'provisoria-123',
      })
      expect(post.status).toBe(403)
      expect(post.body.code).toBe('FORBIDDEN')
    }
  })
})
