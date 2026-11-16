import type { AiStatusDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const AI_STATUS_QUERY_KEY = ['ai-status'] as const

/** Se há provedor de IA configurado (AIQ-16); só quem tem `ai.use` deve chamar. */
export function useAiStatus(enabled = true) {
  return useQuery({
    queryKey: AI_STATUS_QUERY_KEY,
    queryFn: () => apiFetch<AiStatusDto>('/api/ai/status'),
    enabled,
  })
}
