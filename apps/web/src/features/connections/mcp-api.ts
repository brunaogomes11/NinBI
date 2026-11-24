import type {
  McpConnectionCreate,
  McpConnectionDto,
  McpToolDto,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const mcpConnectionsKey = ['mcp-connections'] as const
export const mcpToolsKey = (id: string) => ['mcp-tools', id] as const

export function useCreateMcpConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: McpConnectionCreate) =>
      apiFetch<McpConnectionDto>('/api/mcp/connections', {
        method: 'POST',
        body,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mcpConnectionsKey }),
  })
}

export function useMcpConnections(enabled = true) {
  return useQuery({
    queryKey: mcpConnectionsKey,
    queryFn: ({ signal }) =>
      apiFetch<McpConnectionDto[]>('/api/mcp/connections', { signal }),
    enabled,
    retry: false,
  })
}

export function useMcpTools(id: string) {
  return useQuery({
    queryKey: mcpToolsKey(id),
    queryFn: ({ signal }) =>
      apiFetch<McpToolDto[]>(`/api/mcp/connections/${id}/tools`, { signal }),
    enabled: !!id,
    retry: false,
  })
}

/** Testa o endpoint MCP (lista as ferramentas) sem gravar a conexão. */
export function useTestMcpConnection() {
  return useMutation({
    mutationFn: (values: { name: string; endpoint: string }) =>
      apiFetch<{ ok: true }>('/api/mcp/connections/test', {
        method: 'POST',
        body: values,
      }),
  })
}
