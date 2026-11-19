import { MESSAGES } from '@ninbi/contracts'
import {
  ArrowUpRight,
  Folder,
  LayoutDashboard,
  Search,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useSidebar } from '@/features/dashboards/api'

export function HomePage() {
  const sidebar = useSidebar()
  const [query, setQuery] = useState('')
  const data = sidebar.data
  const organized =
    data?.items.flatMap((item) =>
      item.type === 'group' ? item.items : [item],
    ) ?? []
  const dashboards = [...organized, ...(data?.shared ?? [])]
  const matches = dashboards.filter((item) =>
    item.name
      .toLocaleLowerCase('pt-BR')
      .includes(query.trim().toLocaleLowerCase('pt-BR')),
  )
  const metrics = [
    {
      label: 'Dashboards disponíveis',
      value: dashboards.length,
      Icon: LayoutDashboard,
    },
    {
      label: 'Grupos',
      value: data?.items.filter((item) => item.type === 'group').length,
      Icon: Folder,
    },
    {
      label: 'Recebidos para organizar',
      value: data?.shared.length,
      Icon: Users,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="ocean-heading">
        <h1>Visão geral</h1>
      </div>
      <div className="ocean-metrics grid gap-3 grid-cols-3">
        {metrics.map(({ label, value, Icon }) => (
          <Card key={label} className="ocean-metric gap-2 p-5">
            <Icon aria-hidden="true" className="size-5" />
            <span className="font-medium text-sm">{label}</span>
            {data ? (
              <strong className="text-3xl tabular-nums">{value}</strong>
            ) : (
              <Skeleton className="h-9 w-12" />
            )}
          </Card>
        ))}
      </div>
      <Card className="gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="ocean-section-title">Dashboards</h2>
          {dashboards.length > 0 && (
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Buscar dashboards"
                placeholder="Buscar dashboards..."
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          )}
        </div>
        {sidebar.isError ? (
          <p role="alert">{sidebar.error.message}</p>
        ) : !data ? (
          <Skeleton className="h-16 w-full" />
        ) : dashboards.length === 0 ? (
          <div className="ocean-empty">
            <LayoutDashboard
              aria-hidden="true"
              className="size-6 text-accent-text"
            />
            <h3 className="font-semibold">{MESSAGES.dashboardsEmpty}</h3>
            <p className="text-sm text-muted-foreground">
              Os dashboards que você criar ou receber aparecem aqui.
            </p>
          </div>
        ) : matches.length === 0 ? (
          <p className="text-muted-foreground">Nenhum dashboard encontrado.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {matches.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/dashboards/${item.id}`}
                  aria-label={`Abrir dashboard ${item.name}`}
                  className="flex items-center gap-3 rounded-control border px-4 py-3 hover:bg-accent focus-visible:ring-2"
                >
                  <LayoutDashboard className="size-4 shrink-0 text-accent-text" />
                  <span className="flex-1 truncate">{item.name}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
