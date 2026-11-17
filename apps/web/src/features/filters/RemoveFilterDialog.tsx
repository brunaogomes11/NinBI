import { type DashboardFilter, MESSAGES } from '@ninbi/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/** Pede a confirmação com o número de widgets que usam o parâmetro (FLT-16). */
export function RemoveFilterDialog({
  filter,
  widgetCount,
  onConfirm,
  onClose,
}: {
  filter: DashboardFilter
  widgetCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {MESSAGES.filterRemoveConfirm(filter.label, widgetCount)}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
