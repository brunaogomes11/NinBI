import type {
  AiStatusDto,
  AiWidgetEvent,
  AiWidgetRequest,
} from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { postNdjson } from '@/lib/ndjson'

export const AI_STATUS_QUERY_KEY = ['ai-status'] as const

/** Se há provedor de IA configurado (AIQ-16); só quem tem `ai.use` deve chamar. */
export function useAiStatus(enabled = true) {
  return useQuery({
    queryKey: AI_STATUS_QUERY_KEY,
    queryFn: () => apiFetch<AiStatusDto>('/api/ai/status'),
    enabled,
  })
}

/**
 * Pede o widget à IA e lê a resposta NDJSON: `onEvent` recebe cada linha ao chegar
 * e o último evento volta como resultado (AIQ-12).
 */
export function streamAiWidget(
  dashboardId: string,
  body: AiWidgetRequest,
  signal: AbortSignal,
  onEvent: (event: AiWidgetEvent) => void,
): Promise<AiWidgetEvent> {
  return postNdjson<AiWidgetEvent>(
    `/api/dashboards/${dashboardId}/ai/widget`,
    body,
    signal,
    onEvent,
  )
}
