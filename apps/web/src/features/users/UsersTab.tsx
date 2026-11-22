import { MESSAGES, ROLE_LABELS, type UserDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { TopBarAction } from '@/features/shell/TopBar'
import { TeamsSection } from '@/features/teams/TeamsSection'
import { apiFetch } from '@/lib/api'
import { NewUserDialog } from './NewUserDialog'
import { USERS_QUERY_KEY } from './queryKeys'
import { UserRowActions } from './UserRowActions'

const SKELETON_ROWS = 5

function StatusBadge({ status }: { status: UserDto['status'] }) {
  return status === 'ACTIVE' ? (
    <Badge variant="secondary">Ativo</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {status === 'PENDING' ? 'Aguardando aprovação' : 'Desativado'}
    </Badge>
  )
}

export function UsersTab() {
  const [newUserOpen, setNewUserOpen] = useState(false)
  const users = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => apiFetch<UserDto[]>('/api/users'),
  })

  return (
    <>
      <TopBarAction>
        <Button
          type="button"
          onClick={() => setNewUserOpen(true)}
          className="bg-[image:var(--gradient-brand)] text-primary-foreground"
        >
          <Plus aria-hidden="true" />
          Novo usuário
        </Button>
      </TopBarAction>
      <NewUserDialog open={newUserOpen} onOpenChange={setNewUserOpen} />
      {users.isError ? (
        <Card className="items-start gap-3 rounded-card p-6">
          <p role="alert" className="text-destructive">
            {MESSAGES.usersLoadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => users.refetch()}
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
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-busy={users.isPending}>
              {users.isPending
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: linhas de esqueleto são todas iguais
                    <TableRow key={index}>
                      {[0, 1, 2, 3, 4].map((cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-4 w-full max-w-40" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : users.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell>
                        <UserRowActions user={user} />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <TeamsSection />
    </>
  )
}
