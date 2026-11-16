import { MESSAGES, type TeamDto } from '@ninbi/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteTeam } from './api'

export function DeleteTeamDialog({
  team,
  onClose,
}: {
  team: TeamDto
  onClose: () => void
}) {
  const remove = useDeleteTeam(team.id)

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{MESSAGES.deleteTeam}</AlertDialogTitle>
          <AlertDialogDescription>
            {MESSAGES.teamDeleteConfirm(team.name, team.shareCount)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error ? (
          <p role="alert" className="text-destructive text-sm">
            {remove.error.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            onClick={(event) => {
              // o diálogo só fecha quando a chamada dá certo
              event.preventDefault()
              remove.mutate(undefined, { onSuccess: onClose })
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
