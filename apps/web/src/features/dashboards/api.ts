import type { QueryResultDto, SidebarDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Executa o Cypher salvo de um widget, pelo id (quem só vê usa esta rota). */
export function runWidget(
  dashboardId: string,
  widgetId: string,
  signal?: AbortSignal,
): Promise<QueryResultDto> {
  return apiFetch<QueryResultDto>(
    `/api/dashboards/${dashboardId}/widgets/${widgetId}/run`,
    { method: 'POST', body: {}, signal },
  )
}

/** Executa um Cypher enviado como texto (só quem edita o dashboard). */
export function runQuery(
  dashboardId: string,
  body: { cypher: string; connectionId?: string },
  signal?: AbortSignal,
): Promise<QueryResultDto> {
  return apiFetch<QueryResultDto>(`/api/dashboards/${dashboardId}/query`, {
    method: 'POST',
    body,
    signal,
  })
}

export const SIDEBAR_QUERY_KEY = ['sidebar'] as const

/** Dashboards e grupos da sidebar do usuário, na ordem que ele definiu. */
export function useSidebar() {
  return useQuery({
    queryKey: SIDEBAR_QUERY_KEY,
    queryFn: () => apiFetch<SidebarDto>('/api/sidebar'),
  })
}
