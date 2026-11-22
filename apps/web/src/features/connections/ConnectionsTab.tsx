import { type ConnectionDto, can, MESSAGES } from '@ninbi/contracts'
import { Plus } from 'lucide-react'
import { Fragment, useState } from 'react'
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
import { connectionTypeLabel, useConnections } from './api'
import { ConnectionFormDialog } from './ConnectionFormDialog'
import { ConnectionRowActions } from './ConnectionRowActions'
import { McpCatalog } from './McpCatalog'
import { useMcpConnections } from './mcp-api'

const SKELETON_ROWS = 5

function lastRead(connection: ConnectionDto): string {
  if (connection.schemaStatus === 'READING') return 'Lendo schema...'
  return connection.schemaReadAt
    ? formatDateTime(connection.schemaReadAt)
    : 'Nunca lido'
}

/** A URI no Neo4j e `host:porta` nas conexões SQL. */
function address(connection: ConnectionDto): string {
  return connection.type === 'NEO4J'
    ? (connection.uri ?? '')
    : `${connection.host}:${connection.port}`
}

export function ConnectionsTab() {
  const { user } = useSession()
  const canManage = !!user && can(user.role, 'connections.manage')
  const connections = useConnections()
  const mcpConnections = useMcpConnections()
  const [newOpen, setNewOpen] = useState(false)
  const [expandedMcp, setExpandedMcp] = useState<string | null>(null)
  const columns = canManage ? 6 : 5
  const empty =
    connections.data?.length === 0 && mcpConnections.data?.length === 0

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
        <ConnectionFormDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onMcpCreated={setExpandedMcp}
        />
      )}
      {connections.isError && (
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
      )}
      {mcpConnections.isError && (
        <Card className="items-start gap-3 rounded-card p-6">
          <p role="alert" className="text-destructive">
            Não foi possível carregar as conexões MCP.{' '}
            {mcpConnections.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => mcpConnections.refetch()}
          >
            Tentar novamente carregar MCP
          </Button>
        </Card>
      )}
      {(!connections.isError ||
        mcpConnections.isPending ||
        !!mcpConnections.data?.length) && (
        <Card className="rounded-card py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URI</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Última leitura do schema</TableHead>
                <TableHead>Tipo</TableHead>
                {canManage && (
                  <TableHead className="w-40">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody
              aria-busy={connections.isPending || mcpConnections.isPending}
            >
              {(connections.isPending || mcpConnections.isPending) &&
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
                ))}
              {empty && (
                <TableRow>
                  <TableCell
                    colSpan={columns}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {MESSAGES.connectionsEmpty}
                  </TableCell>
                </TableRow>
              )}
              {connections.data?.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/configuracoes/conexoes/${connection.id}`}
                      className="text-accent-text hover:underline"
                    >
                      {connection.name}
                    </Link>
                  </TableCell>
                  <TableCell>{address(connection)}</TableCell>
                  <TableCell>
                    {connection.database ?? 'Padrão do servidor'}
                  </TableCell>
                  <TableCell>{lastRead(connection)}</TableCell>
                  <TableCell>{connectionTypeLabel(connection.type)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <ConnectionRowActions connection={connection} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {mcpConnections.data?.map((connection) => (
                <Fragment key={connection.id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      {connection.name}
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal break-all">
                      {connection.endpoint ?? '—'}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>MCP</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-expanded={expandedMcp === connection.id}
                          onClick={() =>
                            setExpandedMcp(
                              expandedMcp === connection.id
                                ? null
                                : connection.id,
                            )
                          }
                        >
                          Ferramentas
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                  {canManage && expandedMcp === connection.id && (
                    <TableRow>
                      <TableCell
                        colSpan={columns}
                        className="whitespace-normal p-4"
                      >
                        <McpCatalog connection={connection} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
