import {
  extractParameterNames,
  type QueryLanguage,
  type QueryParamValue,
  type QueryResultDto,
  type WidgetDto,
} from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { runQuery, runWidget } from '@/features/dashboards/api'
import { useFilterParams } from '@/features/filters/filter-session'
import { relevantParams } from '@/features/filters/filter-values'

/** Em edição o widget roda o Cypher do rascunho, na conexão do rascunho. */
export interface WidgetEditSource {
  connectionId: string
  /** Linguagem da conexão do rascunho; sem ela vale Cypher. */
  language?: QueryLanguage
}

export type FilterParams = Record<string, QueryParamValue>

export function hasWidgetQuery(
  widget: WidgetDto,
  edit?: WidgetEditSource,
): boolean {
  return edit ? (widget.cypher ?? '').trim() !== '' : widget.hasQuery
}

/** Só os parâmetros que o widget usa: em edição os do Cypher do rascunho, senão os salvos (FLT-09). */
export function widgetParams(
  widget: WidgetDto,
  edit: WidgetEditSource | undefined,
  allParams: FilterParams,
): FilterParams {
  const names = edit
    ? extractParameterNames(widget.cypher ?? '', edit.language)
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
    ? (['query', dashboardId, edit.connectionId, widget.cypher] as const)
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
      edit
        ? runQuery(
            dashboardId,
            {
              cypher: widget.cypher ?? '',
              connectionId: edit.connectionId,
              ...(Object.keys(params).length > 0 && { params }),
            },
            signal,
          )
        : runWidget(dashboardId, widget.id, params, signal),
    enabled: hasWidgetQuery(widget, edit),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
