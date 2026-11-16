import { MESSAGES } from '@ninbi/contracts'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import { useAllDashboards } from './api'

const SKELETON_ROWS = 5

/** Aba "Dashboards" das Configurações: todos os dashboards, na ordem da API (DASH-20, DASH-21). */
export function DashboardsTab() {
  const dashboards = useAllDashboards()

  if (dashboards.isError) {
    return (
      <Card className="items-start gap-3 rounded-card p-6">
        <p role="alert" className="text-destructive">
          {MESSAGES.dashboardsLoadFailed}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => dashboards.refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    )
  }

  return (
    <Card className="rounded-card py-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Dono</TableHead>
            <TableHead>Conexão</TableHead>
            <TableHead>Última alteração</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-busy={dashboards.isPending}>
          {dashboards.isPending
            ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas de esqueleto são todas iguais
                <TableRow key={index}>
                  {[0, 1, 2, 3].map((cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : dashboards.data.map((dashboard) => (
                <TableRow key={dashboard.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/dashboards/${dashboard.id}`}
                      className="text-accent-text underline-offset-4 hover:underline"
                    >
                      {dashboard.name}
                    </Link>
                  </TableCell>
                  <TableCell>{dashboard.ownerName}</TableCell>
                  <TableCell>{dashboard.connectionName}</TableCell>
                  <TableCell>{formatDateTime(dashboard.updatedAt)}</TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </Card>
  )
}
