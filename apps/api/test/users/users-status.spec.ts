import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createUser } from '../factories'
import { createTestApp } from '../harness'

const PASSWORD = 'senha-correta-123'
const LAST_ADMIN = 'É preciso existir ao menos um administrador ativo'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp()
  close = test.close
  const admin = await createUser(test.db, {
    name: 'Admin',
    email: 'admin@x.com',
    role: 'ADMIN',
  })
  const editor = await createUser(test.db, {
    name: 'Eva',
    email: 'eva@x.com',
    role: 'EDITOR',
  })
  const login = await test.http
    .post('/api/auth/login')
    .send({ email: 'admin@x.com', password: PASSWORD })
  expect(login.status).toBe(200)
  const evaAgent = request.agent(test.app.getHttpServer())
  const evaLogin = await evaAgent
    .post('/api/auth/login')
    .send({ email: 'eva@x.com', password: PASSWORD })
  expect(evaLogin.status).toBe(200)
  return { ...test, admin, editor, evaAgent }
}

function loginAs(app: { getHttpServer(): unknown }, email: string) {
  return request(app.getHttpServer() as never)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
}

describe('desativar e reativar usuários', () => {
  it('USR-09 desativar marca Desativado e encerra as sessões', async () => {
    const test = await setup()
    const response = await test.http.post(
      `/api/users/${test.editor.id}/deactivate`,
    )
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: test.editor.id,
      status: 'DISABLED',
    })

    expect((await test.evaAgent.get('/api/auth/me')).status).toBe(401)
    expect((await loginAs(test.app, 'eva@x.com')).status).toBe(401)
    const list = await test.http.get('/api/users')
    const eva = (list.body as Array<Record<string, unknown>>).find(
      (row) => row.id === test.editor.id,
    )
    expect(eva?.status).toBe('DISABLED')
  })

  it('USR-15 usuário desativado com sessão aberta recebe 401', async () => {
    const test = await setup()
    expect((await test.evaAgent.get('/api/auth/me')).status).toBe(200)
    await test.http.post(`/api/users/${test.editor.id}/deactivate`)
    const next = await test.evaAgent.get('/api/auth/me')
    expect(next.status).toBe(401)
    expect(next.body.code).toBe('UNAUTHENTICATED')
  })

  it('USR-10 reativar marca Ativo', async () => {
    const test = await setup()
    await test.http.post(`/api/users/${test.editor.id}/deactivate`)
    const response = await test.http.post(
      `/api/users/${test.editor.id}/reactivate`,
    )
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: test.editor.id,
      status: 'ACTIVE',
    })
    expect((await loginAs(test.app, 'eva@x.com')).status).toBe(200)
  })

  it('USR-11 recusa deixar a instalação sem admin ativo', async () => {
    const test = await setup()
    const deactivate = await test.http.post(
      `/api/users/${test.admin.id}/deactivate`,
    )
    expect(deactivate.status).toBe(409)
    expect(deactivate.body.code).toBe('LAST_ADMIN')
    expect(deactivate.body.message).toBe(LAST_ADMIN)

    const demote = await test.http
      .patch(`/api/users/${test.admin.id}/role`)
      .send({ role: 'EDITOR' })
    expect(demote.status).toBe(409)
    expect(demote.body.message).toBe(LAST_ADMIN)

    const me = await test.http.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.role).toBe('ADMIN')

    // Um Admin desativado não conta como ativo: com o outro desativado, o último continua protegido.
    const second = await createUser(test.db, {
      name: 'Beto',
      email: 'beto@x.com',
      role: 'ADMIN',
    })
    const withTwo = await test.http.post(`/api/users/${second.id}/deactivate`)
    expect(withTwo.status).toBe(200)
    expect(withTwo.body.status).toBe('DISABLED')
    const again = await test.http.post(`/api/users/${test.admin.id}/deactivate`)
    expect(again.status).toBe(409)
  })

  it('USR-11 com dois admins ativos, desativar um funciona', async () => {
    const test = await setup()
    const second = await createUser(test.db, {
      name: 'Beto',
      email: 'beto@x.com',
      role: 'ADMIN',
    })
    const response = await test.http.post(
      `/api/users/${test.admin.id}/deactivate`,
    )
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('DISABLED')
    expect(second.role).toBe('ADMIN')
  })
})
