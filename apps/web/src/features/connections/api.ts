import type { ConnectionDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const CONNECTIONS_QUERY_KEY = ['connections'] as const

export function useConnections() {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: () => apiFetch<ConnectionDto[]>('/api/connections'),
  })
}
