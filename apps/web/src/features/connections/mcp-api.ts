import type { McpConnectionDto, McpToolDto } from '@ninbi/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const mcpConnectionsKey = ['mcp-connections'] as const
export const mcpToolsKey = (id: string) => ['mcp-tools', id] as const

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
