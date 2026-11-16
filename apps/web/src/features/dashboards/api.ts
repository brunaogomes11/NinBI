import type { QueryResultDto } from '@ninbi/contracts'
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
