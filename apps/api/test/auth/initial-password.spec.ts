import { afterEach, describe, expect, it } from 'vitest'
import { createUser, type TestUserInput } from '../factories'
import { createTestApp } from '../harness'
import { ProbeController } from '../support/probe.controller'

const OLD = 'senha-correta-123'
const NEW = 'senha-definitiva-456'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup(user: TestUserInput) {
  const test = await createTestApp({ controllers: [ProbeController] })
  close = test.close
  await createUser(test.db, user)
  const login = await test.http
    .post('/api/auth/login')
    .send({ email: 'ana@x.com', password: OLD })
  expect(login.status).toBe(200)
  return test
}

describe('senha definitiva depois da provisória', () => {
  it('USR-06 senha provisória só permite definir a nova senha', async () => {
    const test = await setup({ mustChangePassword: true })
    expect((await test.http.get('/api/probe')).status).toBe(403)

    const response = await test.http
      .post('/api/auth/initial-password')
      .send({ newPassword: NEW, confirmPassword: NEW })
    expect(response.status).toBe(204)

    expect((await test.http.get('/api/probe')).status).toBe(200)
    const me = await test.http.get('/api/auth/me')
    expect(me.body.mustChangePassword).toBe(false)
    const relogin = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: NEW })
    expect(relogin.status).toBe(200)
    const oldLogin = await test.http
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: OLD })
    expect(oldLogin.status).toBe(401)
  })

  it('USR-06 confirmação diferente responde 400 e mantém o bloqueio', async () => {
    const test = await setup({ mustChangePassword: true })
    const response = await test.http
      .post('/api/auth/initial-password')
      .send({ newPassword: NEW, confirmPassword: 'outra-senha-789' })
    expect(response.status).toBe(400)
    expect(response.body.fieldErrors.confirmPassword).toBe(
      'As senhas não conferem',
    )
    expect((await test.http.get('/api/probe')).status).toBe(403)
  })

  it('USR-06 chamada sem senha provisória responde 409', async () => {
    const test = await setup({ mustChangePassword: false })
    const response = await test.http
      .post('/api/auth/initial-password')
      .send({ newPassword: NEW, confirmPassword: NEW })
    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      code: 'PASSWORD_NOT_TEMPORARY',
      message: 'A senha atual não é provisória',
    })
  })
})
