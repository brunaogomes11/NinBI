import { describe, expect, it } from 'vitest'
import { can, type Permission, ROLE_LABELS, ROLES, type Role } from './roles'

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

describe('ROLE-01 matriz de papéis', () => {
  const roles: Role[] = ['ADMIN', 'EDITOR', 'VIEWER']
  const permissions = Object.keys(MATRIX) as Permission[]

  it('ROLE-01 matriz de papéis tem 9 permissões e 3 papéis', () => {
    expect(permissions).toHaveLength(9)
    expect([...ROLES]).toEqual(roles)
    expect(ROLE_LABELS).toEqual({
      ADMIN: 'Admin',
      EDITOR: 'Editor',
      VIEWER: 'Visualizador',
    })
  })

  for (const permission of permissions) {
    roles.forEach((role, column) => {
      it(`ROLE-01 matriz de papéis: ${role} ${MATRIX[permission][column] ? 'pode' : 'não pode'} ${permission}`, () => {
        expect(can(role, permission)).toBe(MATRIX[permission][column])
      })
    })
  }
})
