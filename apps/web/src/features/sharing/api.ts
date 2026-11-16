import type {
  DashboardSharesDto,
  ShareCandidatesDto,
  SharePermission,
  ShareRecipientInput,
} from '@ninbi/contracts'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

/** Atraso entre a última tecla e a busca de destinatários. */
export const SEARCH_DELAY_MS = 250

export const sharesQueryKey = (dashboardId: string) =>
  ['shares', dashboardId] as const

export function useShares(dashboardId: string) {
  return useQuery({
    queryKey: sharesQueryKey(dashboardId),
    queryFn: () =>
      apiFetch<DashboardSharesDto>(`/api/dashboards/${dashboardId}/shares`),
  })
}

/** Toda mutação devolve a lista inteira: ela vai direto para o cache. */
function useSharesMutation<TVariables>(
  dashboardId: string,
  call: (variables: TVariables) => Promise<DashboardSharesDto>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: call,
    onSuccess: (shares) =>
      queryClient.setQueryData(sharesQueryKey(dashboardId), shares),
  })
}

export function useAddShare(dashboardId: string) {
  return useSharesMutation(
    dashboardId,
    (variables: {
      recipient: ShareRecipientInput
      permission: SharePermission
    }) =>
      apiFetch<DashboardSharesDto>(`/api/dashboards/${dashboardId}/shares`, {
        method: 'POST',
        body: variables,
      }),
  )
}

export function useChangeShare(dashboardId: string) {
  return useSharesMutation(
    dashboardId,
    ({
      shareId,
      permission,
    }: {
      shareId: string
      permission: SharePermission
    }) =>
      apiFetch<DashboardSharesDto>(
        `/api/dashboards/${dashboardId}/shares/${shareId}`,
        { method: 'PATCH', body: { permission } },
      ),
  )
}

export function useRemoveShare(dashboardId: string) {
  return useSharesMutation(dashboardId, (shareId: string) =>
    apiFetch<DashboardSharesDto>(
      `/api/dashboards/${dashboardId}/shares/${shareId}`,
      { method: 'DELETE' },
    ),
  )
}

/** Candidatos a destinatário; `q` só vai à API depois de `SEARCH_DELAY_MS` sem digitar e só quando não está vazio. */
export function useShareCandidates(dashboardId: string, q: string) {
  const [delayed, setDelayed] = useState(q)
  useEffect(() => {
    const timer = setTimeout(() => setDelayed(q), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [q])
  return useQuery({
    queryKey: ['share-candidates', dashboardId, delayed] as const,
    queryFn: () =>
      apiFetch<ShareCandidatesDto>(
        `/api/dashboards/${dashboardId}/share-candidates?q=${encodeURIComponent(delayed)}`,
      ),
    enabled: q.trim() !== '' && delayed.trim() !== '',
    placeholderData: keepPreviousData,
  })
}
