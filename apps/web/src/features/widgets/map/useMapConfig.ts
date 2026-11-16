import type { MapConfigDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const MAP_CONFIG_QUERY_KEY = ['map-config'] as const

/** Endereço dos tiles e atribuição da instalação (`GET /api/map-config`). */
export function useMapConfig() {
  return useQuery<MapConfigDto>({
    queryKey: MAP_CONFIG_QUERY_KEY,
    queryFn: () => apiFetch<MapConfigDto>('/api/map-config'),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
