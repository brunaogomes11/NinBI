import { can, type Permission, type Role } from '@ninbi/contracts'

export interface SettingsTab {
  id: string
  label: string
  permission: Permission
  /** Fica true quando a feature dona do conteúdo da aba existe. */
  available: boolean
}

/** Ordem do registro = ordem das abas na página "Configurações". */
export const SETTINGS_TABS: SettingsTab[] = [
  {
    id: 'conexoes',
    label: 'Conexões',
    permission: 'connections.read',
    available: true,
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    permission: 'users.manage',
    available: true,
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    permission: 'dashboards.all',
    available: true,
  },
  { id: 'llm', label: 'LLM', permission: 'llm.manage', available: true },
]

/** Abas prontas que o papel pode abrir, na ordem do registro. */
export function visibleSettingsTabs(role: Role): SettingsTab[] {
  return SETTINGS_TABS.filter(
    (tab) => tab.available && can(role, tab.permission),
  )
}
