import type { ComponentType } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ForbiddenPage } from '@/features/auth/ForbiddenPage'
import { useSession } from '@/features/auth/useSession'
import { ConnectionsTab } from '@/features/connections/ConnectionsTab'
import { DashboardsTab } from '@/features/dashboards/DashboardsTab'
import { UsersTab } from '@/features/users/UsersTab'
import { visibleSettingsTabs } from './settingsTabs'

/** Conteúdo de cada aba pelo id; cada feature registra o seu aqui. */
const TAB_CONTENT: Record<string, ComponentType> = {
  conexoes: ConnectionsTab,
  usuarios: UsersTab,
  dashboards: DashboardsTab,
}

/** `/configuracoes` abre a primeira aba que o papel vê. */
export function SettingsIndexRedirect() {
  const { user } = useSession()
  const first = user ? visibleSettingsTabs(user.role)[0] : undefined
  if (!first) return <ForbiddenPage />
  return <Navigate to={`/configuracoes/${first.id}`} replace />
}

/** `/configuracoes/:aba`: a aba aberta vive na URL, então recarregar mantém a aba. */
export function SettingsPage() {
  const { user } = useSession()
  const { aba } = useParams()
  const navigate = useNavigate()
  const tabs = user ? visibleSettingsTabs(user.role) : []

  if (!tabs.some((tab) => tab.id === aba)) return <ForbiddenPage />

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl">Configurações</h1>
      <Tabs
        value={aba}
        onValueChange={(id) => navigate(`/configuracoes/${id}`)}
      >
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => {
          const Content = TAB_CONTENT[tab.id]
          return (
            <TabsContent key={tab.id} value={tab.id}>
              {Content && <Content />}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
