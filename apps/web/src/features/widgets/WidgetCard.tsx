import { MESSAGES, type WidgetDto } from '@ninbi/contracts'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ResultTable } from './ResultTable'
import {
  hasWidgetQuery,
  useWidgetResult,
  type WidgetEditSource,
} from './useWidgetResult'

/** Classe da alça de arrasto do widget na grade: só o título arrasta (GRID-02). */
export const DRAG_HANDLE_CLASS = 'widget-drag-handle'

export interface WidgetCardProps {
  dashboardId: string
  version: number
  widget: WidgetDto
  /** Presente só em edição: o resultado vem do Cypher e da conexão do rascunho. */
  edit?: WidgetCardEdit
}

/** Em edição o card também oferece "Editar widget" e "Remover widget". */
export interface WidgetCardEdit extends WidgetEditSource {
  onEdit?: () => void
  onRemove?: () => void
}

function Body({ dashboardId, version, widget, edit }: WidgetCardProps) {
  const query = useWidgetResult(dashboardId, version, widget, edit)
  // Quem só vê não recebe o Cypher (`cypher` nulo) e nunca lê a mensagem crua do servidor (TBL-12).
  const canSeeErrors = edit !== undefined || widget.cypher !== null

  if (!hasWidgetQuery(widget, edit)) {
    return (
      <p className="text-sm text-muted-foreground">{MESSAGES.widgetNoQuery}</p>
    )
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-destructive">
          {canSeeErrors ? query.error.message : MESSAGES.widgetLoadFailed}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }
  if (!query.data) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    )
  }
  if (query.data.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{MESSAGES.queryNoData}</p>
    )
  }
  return <ResultTable result={query.data} />
}

function WidgetMenu({ title, edit }: { title: string; edit: WidgetCardEdit }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label={`Ações do widget ${title}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => edit.onEdit?.()}>
            Editar widget
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>
            Remover widget
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o widget {title}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => edit.onRemove?.()}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function WidgetCard(props: WidgetCardProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3 rounded-card bg-card p-4">
      <h3
        className={cn(
          'truncate font-semibold',
          props.edit && `${DRAG_HANDLE_CLASS} cursor-move pr-8`,
        )}
      >
        {props.widget.title}
      </h3>
      {props.edit && (
        <div className="absolute top-2 right-2">
          <WidgetMenu title={props.widget.title} edit={props.edit} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <Body {...props} />
      </div>
    </div>
  )
}
