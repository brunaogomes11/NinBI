import { type ConnectionDto, can, MESSAGES } from '@ninbi/contracts'
import { Plus } from 'lucide-react'
import { useState } from 'react'
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
import { useSession } from '@/features/auth/useSession'
import { TopBarAction } from '@/features/shell/TopBar'
import { formatDateTime } from '@/lib/format'
import { useConnections } from './api'
import { ConnectionFormDialog } from './ConnectionFormDialog'
import { ConnectionRowActions } from './ConnectionRowActions'

const SKELETON_ROWS = 5

function lastRead(connection: ConnectionDto): string {
  if (connection.schemaStatus === 'READING') return 'Lendo schema...'
  return connection.schemaReadAt
    ? formatDateTime(connection.schemaReadAt)
    : 'Nunca lido'
}

export function ConnectionsTab() {
  const { user } = useSession()
  const canManage = !!user && can(user.role, 'connections.manage')
  const connections = useConnections()
  const [newOpen, setNewOpen] = useState(false)
  const columns = canManage ? 5 : 4

  return (
    <>
      {canManage && (
        <TopBarAction>
          <Button
            type="button"
            onClick={() => setNewOpen(true)}
            className="bg-[image:var(--gradient-brand)] text-primary-foreground"
          >
            <Plus aria-hidden="true" />
            Nova conexão
          </Button>
        </TopBarAction>
      )}
      {canManage && (
        <>
          <ConnectionFormDialog open={newOpen} onOpenChange={setNewOpen} />
        </>
      )}
      {connections.isError ? (
        <Card className="items-start gap-3 rounded-card p-6">
          <p role="alert" className="text-destructive">
            {MESSAGES.connectionsLoadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => connections.refetch()}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <Card className="rounded-card py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URI</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Última leitura do schema</TableHead>
                {canManage && (
                  <TableHead className="w-40">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody aria-busy={connections.isPending}>
              {connections.isPending ? (
                Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: linhas de esqueleto são todas iguais
                  <TableRow key={index}>
                    {Array.from({ length: columns }, (_, cell) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: células de esqueleto são todas iguais
                      <TableCell key={cell}>
                        <Skeleton className="h-4 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : connections.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {MESSAGES.connectionsEmpty}
                  </TableCell>
                </TableRow>
              ) : (
                connections.data.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/configuracoes/conexoes/${connection.id}`}
                        className="text-accent-text hover:underline"
                      >
                        {connection.name}
                      </Link>
                    </TableCell>
                    <TableCell>{connection.uri}</TableCell>
                    <TableCell>
                      {connection.database ?? 'Padrão do servidor'}
                    </TableCell>
                    <TableCell>{lastRead(connection)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <ConnectionRowActions connection={connection} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
