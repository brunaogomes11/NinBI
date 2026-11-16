export const ROLES = ['ADMIN', 'EDITOR', 'VIEWER'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Visualizador',
}

export type Permission =
  | 'users.manage'
  | 'connections.manage'
  | 'llm.manage'
  | 'connections.read'
  | 'dashboards.create'
  | 'ai.use'
  | 'dashboards.all'
  | 'dashboards.shared'
  | 'sidebar.own'

const VIEWER_PERMISSIONS: readonly Permission[] = [
  'dashboards.shared',
  'sidebar.own',
]

const EDITOR_PERMISSIONS: readonly Permission[] = [
  ...VIEWER_PERMISSIONS,
  'connections.read',
  'dashboards.create',
  'ai.use',
]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    ...EDITOR_PERMISSIONS,
    'users.manage',
    'connections.manage',
    'llm.manage',
    'dashboards.all',
  ],
  EDITOR: EDITOR_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
