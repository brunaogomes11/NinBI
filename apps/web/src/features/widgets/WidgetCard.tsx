import { MESSAGES, type WidgetDto } from '@ninbi/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ResultTable } from './ResultTable'
import {
  hasWidgetQuery,
  useWidgetResult,
  type WidgetEditSource,
} from './useWidgetResult'

export interface WidgetCardProps {
  dashboardId: string
  version: number
  widget: WidgetDto
  /** Presente só em edição: o resultado vem do Cypher e da conexão do rascunho. */
  edit?: WidgetEditSource
}

function Body({ dashboardId, version, widget, edit }: WidgetCardProps) {
  const query = useWidgetResult(dashboardId, version, widget, edit)

  if (!hasWidgetQuery(widget, edit)) {
    return (
      <p className="text-sm text-muted-foreground">{MESSAGES.widgetNoQuery}</p>
    )
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}
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

export function WidgetCard(props: WidgetCardProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-card bg-card p-4">
      <h3 className="truncate font-semibold">{props.widget.title}</h3>
      <div className="flex min-h-0 flex-1 flex-col">
        <Body {...props} />
      </div>
    </div>
  )
}
