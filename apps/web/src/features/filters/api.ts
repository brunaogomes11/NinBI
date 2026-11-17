import type {
  DashboardFilter,
  FilterOptionsDto,
  FilterScalar,
} from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Opções de um filtro "Consulta Cypher" pela consulta salva (quem vê o dashboard). */
export function fetchSavedFilterOptions(
  dashboardId: string,
  filterId: string,
  signal?: AbortSignal,
): Promise<FilterOptionsDto> {
  return apiFetch<FilterOptionsDto>(
    `/api/dashboards/${dashboardId}/filters/${filterId}/options`,
    { method: 'POST', body: {}, signal },
  )
}

/** Opções pela consulta do rascunho (quem edita o dashboard). */
export function fetchDraftFilterOptions(
  dashboardId: string,
  body: { cypher: string; connectionId?: string },
  signal?: AbortSignal,
): Promise<FilterOptionsDto> {
  return apiFetch<FilterOptionsDto>(
    `/api/dashboards/${dashboardId}/filter-options`,
    { method: 'POST', body, signal },
  )
}

/** Em edição as opções vêm do rascunho, na conexão dele. */
export interface FilterOptionsSource {
  dashboardId: string
  version: number
  edit?: { connectionId: string }
}

export interface FilterOptionsState {
  options: FilterScalar[]
  loading: boolean
  failed: boolean
  retry: () => void
}

/** Opções de um filtro de seleção: lista fixa direto, consulta Cypher pela API. */
export function useFilterOptions(
  filter: DashboardFilter,
  source: FilterOptionsSource,
): FilterOptionsState {
  const staticValues =
    filter.options?.source === 'STATIC' ? filter.options.values : null
  const cypher =
    filter.options?.source === 'QUERY' ? (filter.options.cypher ?? '') : ''
  const { dashboardId, version, edit } = source
  const query = useQuery({
    queryKey: edit
      ? ['filter-options-draft', dashboardId, edit.connectionId, cypher]
      : ['filter-options', dashboardId, version, filter.id],
    queryFn: async ({ signal }) =>
      (edit
        ? await fetchDraftFilterOptions(
            dashboardId,
            { cypher, connectionId: edit.connectionId },
            signal,
          )
        : await fetchSavedFilterOptions(dashboardId, filter.id, signal)
      ).options,
    enabled:
      staticValues === null &&
      filter.options?.source === 'QUERY' &&
      (edit ? cypher.trim() !== '' : true),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  if (staticValues) {
    return {
      options: staticValues,
      loading: false,
      failed: false,
      retry: () => {},
    }
  }
  return {
    options: query.data ?? [],
    loading: query.isFetching && !query.data,
    failed: query.isError,
    retry: () => void query.refetch(),
  }
}
