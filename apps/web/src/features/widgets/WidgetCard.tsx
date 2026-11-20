import { MESSAGES, type WidgetDto } from '@ninbi/contracts'
import { MoreHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { AskAiPanel } from '@/features/ai/AskAiPanel'
import type { AiGenerationState } from '@/features/ai/useAiGenerations'
import { WidgetExportMenu } from '@/features/export/WidgetExportMenu'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResultTable } from './ResultTable'
import {
  hasWidgetQuery,
  useWidgetResult,
  type WidgetEditSource,
} from './useWidgetResult'
import { WidgetVisualization } from './WidgetVisualization'

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
  /** Presente só para quem pode usar a IA (`ai.use`): "Pedir à IA" no menu e o painel no card. */
  ai?: WidgetAi
}

/** Os controles da IA de um widget. */
export interface WidgetAi {
  /** Há provedor de IA configurado (AIQ-16). */
  available: boolean
  /** O assistente está respondendo: um pedido por vez (CHAT-25). */
  busy?: boolean
  state: AiGenerationState
  onStart: (prompt: string) => void
  onCancel: () => void
}

function Body({ dashboardId, version, widget, edit }: WidgetCardProps) {
  const query = useWidgetResult(dashboardId, version, widget, edit)
  // Quem só vê não recebe o Cypher (`cypher` nulo) e nunca lê a mensagem crua do servidor (TBL-12).
  const canSeeErrors =
    edit !== undefined || widget.cypher !== null || widget.mcpCall !== undefined

  if (!hasWidgetQuery(widget, edit)) {
    return (
      <p className="text-sm text-muted-foreground">{MESSAGES.widgetNoQuery}</p>
    )
  }
  if (query.isError && !query.data) {
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
  // Falha de uma atualização: os dados anteriores ficam e a hora da falha aparece (RFR-10).
  const refreshFailed = query.isError ? (
    <p className="text-muted-foreground text-xs">
      {MESSAGES.refreshFailedAt(formatClock(query.errorUpdatedAt))}
    </p>
  ) : null
  if (query.data.rows.length === 0) {
    return (
      <>
        <p className="text-sm text-muted-foreground">{MESSAGES.queryNoData}</p>
        {query.data.columnTypes && widget.visualization === 'TABLE' && (
          <ResultTable result={query.data} />
        )}
        {refreshFailed}
      </>
    )
  }
  return (
    <>
      {query.data.columnTypes &&
        query.data.truncated &&
        widget.visualization !== 'TABLE' && (
          <p className="text-sm text-muted-foreground">
            {MESSAGES.rowsTruncated(query.data.rowLimit)}
          </p>
        )}
      <WidgetVisualization
        result={query.data}
        visualization={widget.visualization}
        config={widget.config}
        widgetId={widget.id}
        interactive={edit === undefined}
      />
      {refreshFailed}
    </>
  )
}

function WidgetMenu({
  title,
  edit,
  onAskAi,
}: {
  title: string
  edit: WidgetCardEdit
  onAskAi: () => void
}) {
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
          {edit.ai && (
            <DropdownMenuItem
              disabled={
                !edit.ai.available ||
                edit.ai.busy === true ||
                edit.ai.state.running !== undefined
              }
              onSelect={onAskAi}
            >
              <span className="flex flex-col">
                Pedir à IA
                {!edit.ai.available && (
                  <span className="text-muted-foreground text-xs">
                    {MESSAGES.llmNotConfigured}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          )}
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

/** O painel "Pedir à IA" dentro do card: abre pelo menu e fecha quando a geração acaba (AIQ-12). */
function CardAi({
  ai,
  open,
  onClose,
}: {
  ai: WidgetAi
  open: boolean
  onClose: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const running = ai.state.running !== undefined
  const wasRunning = useRef(false)
  const cancelled = useRef(false)
  const error = ai.state.error?.message ?? null

  useEffect(() => {
    if (running) {
      wasRunning.current = true
      return
    }
    if (!wasRunning.current) return
    wasRunning.current = false
    if (!error && !cancelled.current) {
      setPrompt('')
      onClose()
    }
    cancelled.current = false
  }, [running, error, onClose])

  if (!open && !running && !error) return null
  return (
    <AskAiPanel
      value={prompt}
      onChange={setPrompt}
      onSubmit={() => ai.onStart(prompt.trim())}
      onCancel={() => {
        cancelled.current = true
        ai.onCancel()
      }}
      running={running}
      attempt={ai.state.running?.attempt ?? 1}
      error={error}
    />
  )
}

export function WidgetCard(props: WidgetCardProps) {
  const [askOpen, setAskOpen] = useState(false)
  const closeAsk = useCallback(() => setAskOpen(false), [])
  const cardRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={cardRef}
      data-visualization={props.widget.visualization}
      className="ocean-widget relative flex h-full min-h-0 flex-col gap-3 rounded-card bg-card p-4"
    >
      <h3
        className={cn(
          'truncate pr-8 font-semibold',
          props.edit && `${DRAG_HANDLE_CLASS} cursor-move`,
        )}
      >
        {props.widget.title}
      </h3>
      {!props.edit && (
        <WidgetExportMenu
          dashboardId={props.dashboardId}
          version={props.version}
          widget={props.widget}
          cardRef={cardRef}
        />
      )}
      {props.edit && (
        <div className="absolute top-2 right-2">
          <WidgetMenu
            title={props.widget.title}
            edit={props.edit}
            onAskAi={() => setAskOpen(true)}
          />
        </div>
      )}
      {props.edit?.ai && (
        <CardAi ai={props.edit.ai} open={askOpen} onClose={closeAsk} />
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <Body {...props} />
      </div>
    </div>
  )
}
