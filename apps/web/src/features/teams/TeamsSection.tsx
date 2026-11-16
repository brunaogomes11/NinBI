import { MESSAGES, type TeamDto } from '@ninbi/contracts'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTeams } from './api'
import { DeleteTeamDialog } from './DeleteTeamDialog'
import { TeamDialog } from './TeamDialog'

const SKELETON_ROWS = 3

function TeamRowActions({
  team,
  onEdit,
  onDelete,
}: {
  team: TeamDto
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Ações da equipe ${team.name}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          {MESSAGES.editTeam}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete}>
          {MESSAGES.deleteTeam}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TeamsSection() {
  const teams = useTeams()
  const [dialog, setDialog] = useState<'new' | TeamDto | null>(null)
  const [deleting, setDeleting] = useState<TeamDto | null>(null)

  return (
    <section aria-labelledby="teams-title" className="mt-8 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="teams-title" className="font-semibold text-lg">
          {MESSAGES.teamsTitle}
        </h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDialog('new')}
        >
          <Plus aria-hidden="true" />
          {MESSAGES.newTeam}
        </Button>
      </div>
      {teams.isError ? (
        <Card className="items-start gap-3 rounded-card p-6">
          <p role="alert" className="text-destructive">
            {MESSAGES.teamsLoadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => teams.refetch()}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : teams.isPending ? (
        <Card className="gap-3 rounded-card p-6" aria-busy="true">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: linhas de esqueleto são todas iguais
            <Skeleton key={index} className="h-4 w-full max-w-60" />
          ))}
        </Card>
      ) : teams.data.length === 0 ? (
        <Card className="rounded-card p-6 text-muted-foreground">
          {MESSAGES.teamsEmpty}
        </Card>
      ) : (
        <Card className="rounded-card py-2">
          <Table aria-label={MESSAGES.teamsTitle}>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.data.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.memberCount}</TableCell>
                  <TableCell>
                    <TeamRowActions
                      team={team}
                      onEdit={() => setDialog(team)}
                      onDelete={() => setDeleting(team)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {dialog ? (
        <TeamDialog
          team={dialog === 'new' ? undefined : dialog}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {deleting ? (
        <DeleteTeamDialog team={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </section>
  )
}
