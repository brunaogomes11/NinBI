import type {
  AssistantEvent,
  AssistantMessageDto,
  AssistantRequest,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { postNdjson } from '@/lib/ndjson'

export const assistantQueryKey = (dashboardId: string) =>
  ['assistant', dashboardId] as const

const messagesPath = (dashboardId: string) =>
  `/api/dashboards/${dashboardId}/assistant/messages`

/** A conversa do usuário neste dashboard (HIST-02); só quem edita deve ler. */
export function useAssistantMessages(dashboardId: string, enabled = true) {
  return useQuery({
    queryKey: assistantQueryKey(dashboardId),
    queryFn: () => apiFetch<AssistantMessageDto[]>(messagesPath(dashboardId)),
    enabled,
  })
}

/** Apaga a conversa e esvazia o cache (HIST-05). */
export function useClearAssistant(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch(messagesPath(dashboardId), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData<AssistantMessageDto[]>(
        assistantQueryKey(dashboardId),
        [],
      )
    },
  })
}

/**
 * Envia a mensagem e lê a resposta NDJSON: `onEvent` recebe cada linha ao chegar e o último
 * evento volta como resultado (GEN-08).
 */
export function streamAssistant(
  dashboardId: string,
  body: AssistantRequest,
  signal: AbortSignal,
  onEvent: (event: AssistantEvent) => void,
): Promise<AssistantEvent> {
  return postNdjson<AssistantEvent>(
    messagesPath(dashboardId),
    body,
    signal,
    onEvent,
  )
}
