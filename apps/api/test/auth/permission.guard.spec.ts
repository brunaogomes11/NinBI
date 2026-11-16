import type { Permission, Role } from '@ninbi/contracts'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createUser } from '../factories'
import { createTestApp } from '../harness'
import { PermissionProbeController } from '../support/permission-probe.controller'
import { ProbeController } from '../support/probe.controller'

const PASSWORD = 'senha-correta-123'

// Linha por permissão, colunas Admin / Editor / Visualizador, da matriz da spec.
const MATRIX: Record<Permission, [boolean, boolean, boolean]> = {
  'users.manage': [true, false, false],
  'connections.manage': [true, false, false],
  'llm.manage': [true, false, false],
  'connections.read': [true, true, false],
  'dashboards.create': [true, true, false],
  'ai.use': [true, true, false],
  'dashboards.all': [true, false, false],
  'dashboards.shared': [true, true, true],
  'sidebar.own': [true, true, true],
}
const ROLE_COLUMNS: Role[] = ['ADMIN', 'EDITOR', 'VIEWER']

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

describe('PermissionGuard', () => {
  it('ROLE-01 cada papel recebe 200 ou 403 conforme a matriz', async () => {
    const test = await createTestApp({
      controllers: [PermissionProbeController, ProbeController],
    })
    close = test.close
    const permissions = Object.keys(MATRIX) as Permission[]
    expect(permissions).toHaveLength(9)

    for (const [column, role] of ROLE_COLUMNS.entries()) {
      const email = `${role.toLowerCase()}@x.com`
      await createUser(test.db, { name: role, email, role })
      const agent = request.agent(test.app.getHttpServer())
      const login = await agent
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
      expect(login.status).toBe(200)

      for (const permission of permissions) {
        const response = await agent.get(`/api/probe-permission/${permission}`)
        const allowed = MATRIX[permission][column]
        expect(response.status, `${role} em ${permission}`).toBe(
          allowed ? 200 : 403,
        )
        if (!allowed) {
          expect(response.body).toEqual({
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para realizar esta ação',
          })
        }
      }
      // Sem @RequirePermission, basta estar logado.
      expect((await agent.get('/api/probe')).status).toBe(200)
    }
  })
})
