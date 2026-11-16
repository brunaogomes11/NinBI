import { afterEach, describe, expect, it } from 'vitest'
import { users } from '../../src/database/schema'
import { createUser } from '../factories'
import { createTestApp } from '../harness'

const VALID = {
  name: 'Carla',
  email: 'carla@x.com',
  password: 'senha-forte-123',
  confirmPassword: 'senha-forte-123',
}

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

describe('primeiro administrador', () => {
  it('SETUP-02 cria o admin e inicia a sessão', async () => {
    const test = await setup()
    const response = await test.http.post('/api/setup/admin').send(VALID)
    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      name: 'Carla',
      email: 'carla@x.com',
      role: 'ADMIN',
      mustChangePassword: false,
    })
    const cookies = response.headers['set-cookie'] as unknown as string[]
    expect(cookies.some((item) => item.startsWith('ninbi_session='))).toBe(true)
    const me = await test.http.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.role).toBe('ADMIN')
    expect(me.body.id).toBe(response.body.id)
    const [row] = await test.db.select().from(users)
    expect(row?.passwordHash).not.toContain(VALID.password)
  })

  it('SETUP-03 responde 409 quando já existe usuário', async () => {
    const test = await setup()
    await createUser(test.db)
    const response = await test.http.post('/api/setup/admin').send(VALID)
    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      code: 'SETUP_ALREADY_DONE',
      message: 'A instalação já foi configurada',
    })
    expect(await test.db.select().from(users)).toHaveLength(1)
  })

  it('SETUP-03 segundo envio depois do primeiro responde 409', async () => {
    const test = await setup()
    expect((await test.http.post('/api/setup/admin').send(VALID)).status).toBe(
      201,
    )
    const again = await test.http
      .post('/api/setup/admin')
      .send({ ...VALID, email: 'outro@x.com' })
    expect(again.status).toBe(409)
    expect(again.body.code).toBe('SETUP_ALREADY_DONE')
  })

  it('SETUP-03 status mostra needsSetup antes e depois', async () => {
    const test = await setup()
    const before = await test.http.get('/api/setup/status')
    expect(before.status).toBe(200)
    expect(before.body).toEqual({ needsSetup: true })
    await test.http.post('/api/setup/admin').send(VALID)
    const after = await test.http.get('/api/setup/status')
    expect(after.body).toEqual({ needsSetup: false })
  })

  it('SETUP-04 senha curta responde 400 com a mensagem no campo', async () => {
    const test = await setup()
    const response = await test.http
      .post('/api/setup/admin')
      .send({ ...VALID, password: '1234567', confirmPassword: '1234567' })
    expect(response.status).toBe(400)
    expect(response.body.fieldErrors.password).toBe(
      'A senha precisa ter ao menos 8 caracteres',
    )
    expect(await test.db.select().from(users)).toHaveLength(0)
  })
})
