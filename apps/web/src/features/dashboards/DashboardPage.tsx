import { type DashboardDto, MESSAGES } from '@ninbi/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { TopBarAction } from '@/features/shell/TopBar'
import { widgetResultKey } from '@/features/widgets/useWidgetResult'
import { ApiError } from '@/lib/api'
import { useDashboard } from './api'
import { DashboardGrid } from './DashboardGrid'
import { DashboardTabsBar } from './DashboardTabsBar'
import { DeleteDashboardDialog } from './DeleteDashboardDialog'

function NotFound() {
  return (
    <Card className="items-start gap-3 rounded-card p-6">
      <h1 className="font-semibold text-xl">{MESSAGES.dashboardNotFound}</h1>
      <Link to="/" className="text-accent-text underline">
        Ir para a página inicial
      </Link>
    </Card>
  )
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'DASHBOARD_NOT_FOUND'
}

/** Qualquer 404 `DASHBOARD_NOT_FOUND` de uma consulta deste dashboard troca a página pela mensagem (DASH-15). */
function useNotFoundWatcher(dashboardId: string, onNotFound: () => void) {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (
          event.type === 'updated' &&
          event.action.type === 'error' &&
          event.query.queryKey[1] === dashboardId &&
          isNotFound(event.action.error)
        ) {
          onNotFound()
        }
      }),
    [queryClient, dashboardId, onNotFound],
  )
}

function DashboardView({
  dashboard,
  onNotFound,
}: {
  dashboard: DashboardDto
  onNotFound: () => void
}) {
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedTabId, setSelectedTabId] = useState(dashboard.tabs[0]?.id)
  const activeTab =
    dashboard.tabs.find((tab) => tab.id === selectedTabId) ?? dashboard.tabs[0]
  useNotFoundWatcher(dashboard.id, onNotFound)

  function refresh() {
    for (const widget of activeTab?.widgets ?? []) {
      void queryClient.invalidateQueries({
        queryKey: widgetResultKey(dashboard.id, dashboard.version, widget),
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {dashboard.permissions.edit && (
        <TopBarAction>
          <Button
            type="button"
            className="bg-[image:var(--gradient-brand)] text-primary-foreground"
          >
            Editar
          </Button>
        </TopBarAction>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-semibold text-xl">
          {dashboard.name}
        </h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={refresh}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
          {dashboard.permissions.delete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <DeleteDashboardDialog
        dashboard={dashboard}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onNotFound={onNotFound}
      />
      {activeTab && (
        <>
          <DashboardTabsBar
            tabs={dashboard.tabs}
            activeTabId={activeTab.id}
            onSelect={setSelectedTabId}
          />
          <DashboardGrid
            key={activeTab.id}
            dashboardId={dashboard.id}
            version={dashboard.version}
            widgets={activeTab.widgets}
          />
        </>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { dashboardId = '' } = useParams()
  const dashboard = useDashboard(dashboardId)
  const [goneId, setGoneId] = useState<string | null>(null)

  if (
    goneId === dashboardId ||
    (dashboard.isError && isNotFound(dashboard.error))
  ) {
    return <NotFound />
  }
  if (dashboard.isError) {
    return (
      <Card className="items-start gap-3 rounded-card p-6">
        <p role="alert" className="text-destructive">
          {dashboard.error.message}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => dashboard.refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    )
  }
  if (!dashboard.data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  return (
    <DashboardView
      key={dashboard.data.id}
      dashboard={dashboard.data}
      onNotFound={() => setGoneId(dashboardId)}
    />
  )
}
