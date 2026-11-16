import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createUser } from '../factories'
import { createTestApp } from '../harness'
import { PermissionProbeController } from '../support/permission-probe.controller'

const PASSWORD = 'senha-correta-123'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp({
    controllers: [PermissionProbeController],
  })
  close = test.close
  await createUser(test.db, {
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
  return { ...test, editor, evaAgent }
}

describe('trocar papel e redefinir senha', () => {
  it('USR-07 redefinir senha troca a senha e encerra as sessões', async () => {
    const test = await setup()
    expect((await test.evaAgent.get('/api/auth/me')).status).toBe(200)

    const reset = await test.http
      .post(`/api/users/${test.editor.id}/reset-password`)
      .send({ temporaryPassword: 'nova-provisoria-1' })
    expect(reset.status).toBe(204)

    expect((await test.evaAgent.get('/api/auth/me')).status).toBe(401)
    const oldLogin = await request(test.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'eva@x.com', password: PASSWORD })
    expect(oldLogin.status).toBe(401)
    const newLogin = await request(test.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'eva@x.com', password: 'nova-provisoria-1' })
    expect(newLogin.status).toBe(200)
    expect(newLogin.body.mustChangePassword).toBe(true)
  })

  it('USR-07 usuário inexistente responde 404 e senha curta responde 400', async () => {
    const test = await setup()
    const missing = await test.http
      .post('/api/users/00000000-0000-4000-8000-000000000000/reset-password')
      .send({ temporaryPassword: 'nova-provisoria-1' })
    expect(missing.status).toBe(404)
    expect(missing.body.code).toBe('NOT_FOUND')
    const notUuid = await test.http
      .post('/api/users/abc/reset-password')
      .send({ temporaryPassword: 'nova-provisoria-1' })
    expect(notUuid.status).toBe(404)
    const short = await test.http
      .post(`/api/users/${test.editor.id}/reset-password`)
      .send({ temporaryPassword: 'curta' })
    expect(short.status).toBe(400)
    expect(short.body.fieldErrors.temporaryPassword).toBe(
      'A senha precisa ter ao menos 8 caracteres',
    )
  })

  it('ROLE-05 novo papel vale na próxima requisição', async () => {
    const test = await setup()
    expect(
      (await test.evaAgent.get('/api/probe-permission/dashboards.create'))
        .status,
    ).toBe(200)

    const change = await test.http
      .patch(`/api/users/${test.editor.id}/role`)
      .send({ role: 'VIEWER' })
    expect(change.status).toBe(200)
    expect(change.body).toMatchObject({ id: test.editor.id, role: 'VIEWER' })

    const me = await test.evaAgent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.role).toBe('VIEWER')
    expect(
      (await test.evaAgent.get('/api/probe-permission/dashboards.create'))
        .status,
    ).toBe(403)
  })

  it('ROLE-05 papel inválido responde 400 e usuário inexistente responde 404', async () => {
    const test = await setup()
    const invalid = await test.http
      .patch(`/api/users/${test.editor.id}/role`)
      .send({ role: 'ROOT' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.fieldErrors.role).toBe('Escolha um papel')
    const missing = await test.http
      .patch('/api/users/00000000-0000-4000-8000-000000000000/role')
      .send({ role: 'VIEWER' })
    expect(missing.status).toBe(404)
  })
})
