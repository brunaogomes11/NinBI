import type { SessionUserDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'

export const SESSION_QUERY_KEY = ['session'] as const

async function fetchSession(): Promise<SessionUserDto | null> {
  try {
    return await apiFetch<SessionUserDto>('/api/auth/me', {
      notifyUnauthorized: false,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

/** `user` é null quando não há sessão; `isError` quando a consulta falhou. */
export function useSession() {
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
  }
}
