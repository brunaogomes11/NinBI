import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createUser } from '../factories'
import { createTestApp } from '../harness'

const OLD = 'senha-correta-123'
const NEW = 'nova-senha-456'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp()
  close = test.close
  await createUser(test.db)
  const login = await test.http
    .post('/api/auth/login')
    .send({ email: 'ana@x.com', password: OLD })
  expect(login.status).toBe(200)
  return test
}

async function loginStatus(
  test: Awaited<ReturnType<typeof setup>>,
  password: string,
) {
  const response = await request(test.app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: 'ana@x.com', password })
  return response.status
}

describe('alterar a própria senha', () => {
  it('PWD-01 troca a senha com a senha atual correta', async () => {
    const test = await setup()
    const response = await test.http
      .post('/api/auth/password')
      .send({ currentPassword: OLD, newPassword: NEW })
    expect(response.status).toBe(204)
    expect(await loginStatus(test, NEW)).toBe(200)
    expect(await loginStatus(test, OLD)).toBe(401)
  })

  it('PWD-02 senha atual incorreta é recusada', async () => {
    const test = await setup()
    const response = await test.http
      .post('/api/auth/password')
      .send({ currentPassword: 'senha-errada-999', newPassword: NEW })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      code: 'CURRENT_PASSWORD_INCORRECT',
      message: 'Senha atual incorreta',
    })
    expect(await loginStatus(test, OLD)).toBe(200)
    expect(await loginStatus(test, NEW)).toBe(401)
  })

  it('PWD-03 nova senha curta é recusada', async () => {
    const test = await setup()
    const response = await test.http
      .post('/api/auth/password')
      .send({ currentPassword: OLD, newPassword: '1234567' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(response.body.fieldErrors.newPassword).toBe(
      'A senha precisa ter ao menos 8 caracteres',
    )
    expect(await loginStatus(test, OLD)).toBe(200)
  })
})
