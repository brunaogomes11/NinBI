import type {
  LlmSettingsDto,
  LlmSettingsInput,
  LlmSettingsResponse,
  LlmTestResultDto,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AI_STATUS_QUERY_KEY } from '@/features/ai/api'
import { apiFetch } from '@/lib/api'

export const LLM_QUERY_KEY = ['llm-config'] as const

export function useLlmSettings() {
  return useQuery({
    queryKey: LLM_QUERY_KEY,
    queryFn: () => apiFetch<LlmSettingsResponse>('/api/llm-config'),
  })
}

export function useSaveLlmSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: LlmSettingsInput) =>
      apiFetch<LlmSettingsDto>('/api/llm-config', {
        method: 'PUT',
        body: values,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(LLM_QUERY_KEY, saved)
      return queryClient.invalidateQueries({ queryKey: AI_STATUS_QUERY_KEY })
    },
  })
}

export function useTestLlmSettings() {
  return useMutation({
    mutationFn: (values: LlmSettingsInput) =>
      apiFetch<LlmTestResultDto>('/api/llm-config/test', {
        method: 'POST',
        body: values,
      }),
  })
}

export function useRemoveLlmSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch('/api/llm-config', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData<LlmSettingsResponse>(LLM_QUERY_KEY, {
        configured: false,
      })
      return queryClient.invalidateQueries({ queryKey: AI_STATUS_QUERY_KEY })
    },
  })
}
