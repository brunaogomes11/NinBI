import type { DashboardDto } from '@ninbi/contracts'
import { useNavigate } from 'react-router'
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
import { ApiError } from '@/lib/api'
import { useDeleteDashboard } from './api'

/** "Excluir" do menu "Mais ações": confirma, apaga, atualiza a sidebar e abre a página inicial (DASH-10, DASH-11). */
export function DeleteDashboardDialog({
  dashboard,
  open,
  onOpenChange,
  onNotFound,
}: {
  dashboard: Pick<DashboardDto, 'id' | 'name'>
  open: boolean
  onOpenChange: (open: boolean) => void
  onNotFound: () => void
}) {
  const navigate = useNavigate()
  const remove = useDeleteDashboard(dashboard.id)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir o dashboard {dashboard.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Abas e widgets serão apagados. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error && (
          <p role="alert" className="text-destructive text-sm">
            {remove.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            onClick={(event) => {
              // o diálogo só fecha quando a chamada dá certo
              event.preventDefault()
              remove.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false)
                  navigate('/')
                },
                onError: (error) => {
                  if (
                    error instanceof ApiError &&
                    error.code === 'DASHBOARD_NOT_FOUND'
                  ) {
                    onOpenChange(false)
                    onNotFound()
                  }
                },
              })
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
