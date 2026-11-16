import type { QueryResultDto, WidgetDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { runQuery, runWidget } from '@/features/dashboards/api'

/** Em edição o widget roda o Cypher do rascunho, na conexão do rascunho. */
export interface WidgetEditSource {
  connectionId: string
}

export function hasWidgetQuery(
  widget: WidgetDto,
  edit?: WidgetEditSource,
): boolean {
  return edit ? (widget.cypher ?? '').trim() !== '' : widget.hasQuery
}

export function widgetResultKey(
  dashboardId: string,
  version: number,
  widget: WidgetDto,
  edit?: WidgetEditSource,
) {
  return edit
    ? (['query', dashboardId, edit.connectionId, widget.cypher] as const)
    : (['widget-run', dashboardId, version, widget.id] as const)
}

/** Resultado de um widget; não executa nada quando ele não tem consulta (TBL-14). */
export function useWidgetResult(
  dashboardId: string,
  version: number,
  widget: WidgetDto,
  edit?: WidgetEditSource,
) {
  return useQuery<QueryResultDto>({
    queryKey: widgetResultKey(dashboardId, version, widget, edit),
    queryFn: ({ signal }) =>
      edit
        ? runQuery(
            dashboardId,
            { cypher: widget.cypher ?? '', connectionId: edit.connectionId },
            signal,
          )
        : runWidget(dashboardId, widget.id, signal),
    enabled: hasWidgetQuery(widget, edit),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
