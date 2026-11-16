import { MESSAGES } from '@ninbi/contracts'
import { LayoutDashboard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSidebar } from '@/features/dashboards/api'

export function HomePage() {
  const sidebar = useSidebar()
  const empty = sidebar.data?.items.length === 0

  return (
    <Card className="rounded-card">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <LayoutDashboard
          className="size-10 text-accent-text"
          aria-hidden="true"
        />
        {sidebar.data ? (
          <h1 className="font-semibold text-xl">
            {empty ? MESSAGES.dashboardsEmpty : MESSAGES.dashboardPick}
          </h1>
        ) : (
          <Skeleton className="h-7 w-56" />
        )}
        {empty && (
          <p className="text-muted-foreground text-sm">
            Os dashboards que você criar ou receber aparecem na barra lateral.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
