import {
  type DashboardCreateInput,
  type DashboardDto,
  MESSAGES,
  type QueryResultDto,
  type SidebarDto,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toLayoutInput } from '@/features/sidebar/layout'
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

/**
 * Grava a organização da sidebar. Aplica a mudança na hora; se a gravação
 * falha, devolve o layout anterior e avisa (SIDE-12).
 */
export function useSaveSidebar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (layout: SidebarDto) =>
      apiFetch<SidebarDto>('/api/sidebar', {
        method: 'PUT',
        body: toLayoutInput(layout),
      }),
    onMutate: async (layout) => {
      await queryClient.cancelQueries({ queryKey: SIDEBAR_QUERY_KEY })
      const previous = queryClient.getQueryData<SidebarDto>(SIDEBAR_QUERY_KEY)
      queryClient.setQueryData(SIDEBAR_QUERY_KEY, layout)
      return { previous }
    },
    onError: (_error, _layout, context) => {
      queryClient.setQueryData(SIDEBAR_QUERY_KEY, context?.previous)
      toast.error(MESSAGES.sidebarSaveFailed)
    },
    onSuccess: (saved) => queryClient.setQueryData(SIDEBAR_QUERY_KEY, saved),
  })
}

/** Cria o dashboard (dono = usuário, uma aba "Aba 1") e atualiza a sidebar. */
export function useCreateDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DashboardCreateInput) =>
      apiFetch<DashboardDto>('/api/dashboards', {
        method: 'POST',
        body: values,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SIDEBAR_QUERY_KEY }),
  })
}
