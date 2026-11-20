import {
  extractParameterNames,
  type QueryLanguage,
  type QueryParamValue,
  type QueryResultDto,
  type WidgetDto,
} from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { previewMcp, runQuery, runWidget } from '@/features/dashboards/api'
import { useFilterParams } from '@/features/filters/filter-session'
import { relevantParams } from '@/features/filters/filter-values'

/** Em edição o widget roda o Cypher do rascunho, na conexão do rascunho. */
export interface WidgetEditSource {
  connectionId: string | null
  /** Linguagem da conexão do rascunho; sem ela vale Cypher. */
  language?: QueryLanguage
}

export type FilterParams = Record<string, QueryParamValue>

export function hasWidgetQuery(
  widget: WidgetDto,
  edit?: WidgetEditSource,
): boolean {
  return edit
    ? Boolean(widget.mcpCall) || (widget.cypher ?? '').trim() !== ''
    : widget.hasQuery
}

/** Só os parâmetros que o widget usa: em edição os do Cypher do rascunho, senão os salvos (FLT-09). */
export function widgetParams(
  widget: WidgetDto,
  edit: WidgetEditSource | undefined,
  allParams: FilterParams,
): FilterParams {
  const names = edit
    ? widget.mcpCall
      ? Object.values(widget.mcpCall.filterBindings)
      : extractParameterNames(widget.cypher ?? '', edit.language)
    : widget.parameters
  return relevantParams(names, allParams)
}

/**
 * Chave da execução do widget; `allParams` são os valores atuais de todos os filtros.
 * Sem parâmetros relevantes a chave não leva o objeto (é a chave de antes dos filtros).
 */
export function widgetResultKey(
  dashboardId: string,
  version: number,
  widget: WidgetDto,
  edit?: WidgetEditSource,
  allParams: FilterParams = {},
) {
  const params = widgetParams(widget, edit, allParams)
  const withParams = Object.keys(params).length > 0
  const base = edit
    ? widget.mcpCall
      ? (['mcp-preview', dashboardId, widget.mcpCall] as const)
      : (['query', dashboardId, edit.connectionId, widget.cypher] as const)
    : (['widget-run', dashboardId, version, widget.id] as const)
  return withParams ? ([...base, params] as const) : base
}

/** Resultado de um widget; não executa nada quando ele não tem consulta (TBL-14). */
export function useWidgetResult(
  dashboardId: string,
  version: number,
  widget: WidgetDto,
  edit?: WidgetEditSource,
) {
  const allParams = useFilterParams()
  const params = widgetParams(widget, edit, allParams)
  return useQuery<QueryResultDto>({
    queryKey: widgetResultKey(dashboardId, version, widget, edit, allParams),
    queryFn: ({ signal }) =>
      edit && widget.mcpCall
        ? previewMcp(dashboardId, { call: widget.mcpCall, params }, signal)
        : edit
          ? runQuery(
              dashboardId,
              {
                cypher: widget.cypher ?? '',
                connectionId: edit.connectionId ?? undefined,
                ...(Object.keys(params).length > 0 && { params }),
              },
              signal,
            )
          : runWidget(dashboardId, widget.id, params, signal),
    enabled: hasWidgetQuery(widget, edit),
    staleTime:
      widget.sourceKind === 'MCP' || widget.mcpCall
        ? 0
        : Number.POSITIVE_INFINITY,
    retry: false,
  })
}
