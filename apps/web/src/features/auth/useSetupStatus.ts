import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const SETUP_STATUS_QUERY_KEY = ['setup-status'] as const

export interface SetupStatus {
  needsSetup: boolean
}

export function useSetupStatus() {
  const query = useQuery({
    queryKey: SETUP_STATUS_QUERY_KEY,
    queryFn: () =>
      apiFetch<SetupStatus>('/api/setup/status', { notifyUnauthorized: false }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  return {
    needsSetup: query.data?.needsSetup ?? false,
    isLoading: query.isPending,
    error: query.error,
  }
}
