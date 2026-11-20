import type { Role } from '@ninbi/contracts'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUser } from '../factories'
import { createTestApp } from '../harness'

const route = '/api/mcp/connections'

describe('conexões MCP', () => {
  let test: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    test = await createTestApp()
  }, 120_000)
  afterAll(async () => test?.close())

  async function login(role: Role) {
    const email = `${role.toLowerCase()}@mcp.example`
    await createUser(test.db, { email, name: role, role })
    const agent = request.agent(test.app.getHttpServer())
    await agent
      .post('/api/auth/login')
      .send({ email, password: 'senha-correta-123' })
      .expect(200)
    return agent
  }

  it('MCP-01 cadastro mantém dois servidores independentes', async () => {
    const admin = await login('ADMIN')
    const first = { name: 'Chamados', endpoint: 'http://127.0.0.1:8765/mcp' }
    const second = {
      name: 'Projetos',
      endpoint: 'https://mcp.example/projects',
    }
    const a = (await admin.post(route).send(first).expect(201)).body
    const b = (await admin.post(route).send(second).expect(201)).body
    expect(a.id).not.toBe(b.id)
    await admin
      .patch(`${route}/${a.id}`)
      .send({ enabledTools: ['list_tickets'] })
      .expect(200)
    const { body } = await admin.get(route).expect(200)
    expect(body).toEqual([
      { ...first, id: a.id, enabledTools: ['list_tickets'] },
      { ...second, id: b.id, enabledTools: [] },
    ])
  })

  it('MCP-04 cadastro sem permissão é recusado', async () => {
    const editor = await login('EDITOR')
    await editor
      .post(route)
      .send({ name: 'Outro', endpoint: 'https://mcp.example/mcp' })
      .expect(403)
    const { body } = await editor.get(route).expect(200)
    expect(body).not.toContainEqual(expect.objectContaining({ name: 'Outro' }))
    expect(
      body.every((connection: object) => !('endpoint' in connection)),
    ).toBe(true)
  })
})
