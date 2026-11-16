import type {
  ConnectionCreate,
  ConnectionDto,
  ConnectionUpdate,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const CONNECTIONS_QUERY_KEY = ['connections'] as const

export function useConnections() {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: () => apiFetch<ConnectionDto[]>('/api/connections'),
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ConnectionCreate) =>
      apiFetch<ConnectionDto>('/api/connections', {
        method: 'POST',
        body: values,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY }),
  })
}

export function useUpdateConnection(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ConnectionUpdate) =>
      apiFetch<ConnectionDto>(`/api/connections/${id}`, {
        method: 'PATCH',
        body: values,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY }),
  })
}

export function useDeleteConnection(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch(`/api/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY }),
  })
}
