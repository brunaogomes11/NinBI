import type { McpConnectionDto } from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import {
  mcpConnectionsKey,
  mcpToolsKey,
  useMcpConnections,
  useMcpTools,
} from './mcp-api'

function McpCatalog({ connection }: { connection: McpConnectionDto }) {
  const queryClient = useQueryClient()
  const catalog = useMcpTools(connection.id)
  const update = useMutation({
    mutationFn: (enabledTools: string[]) =>
      apiFetch(`/api/mcp/connections/${connection.id}`, {
        method: 'PATCH',
        body: { enabledTools },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mcpConnectionsKey })
      await queryClient.invalidateQueries({
        queryKey: mcpToolsKey(connection.id),
      })
    },
  })
  if (catalog.isPending) return <p role="status">Carregando ferramentas…</p>
  if (catalog.isError)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p role="alert" className="text-destructive">
          {catalog.error.message}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void catalog.refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    )
  if (catalog.data.length === 0) return <p>Nenhuma ferramenta encontrada.</p>
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-sm">
        Habilite apenas ferramentas que consultam dados.
      </p>
      {catalog.data.map((tool) => (
        <label
          key={tool.name}
          className="flex items-start gap-2 break-all text-sm"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={tool.enabled}
            disabled={
              update.isPending ||
              tool.readOnlyHint === false ||
              !tool.lists.length
            }
            onChange={(event) => {
              const existing = connection.enabledTools ?? []
              update.mutate(
                event.target.checked
                  ? [...existing, tool.name]
                  : existing.filter((name) => name !== tool.name),
              )
            }}
          />
          <span>
            {tool.name}
            {tool.description && (
              <span className="block text-muted-foreground">
                {tool.description}
              </span>
            )}
            {tool.readOnlyHint === false
              ? ' · Escrita'
              : !tool.lists.length
                ? ' · Sem lista tipada'
                : ''}
          </span>
        </label>
      ))}
      {update.isError && (
        <p role="alert" className="text-destructive">
          {update.error.message}
        </p>
      )}
    </div>
  )
}

export function McpConnectionsPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient()
  const connections = useMcpConnections()
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: () =>
      apiFetch<McpConnectionDto>('/api/mcp/connections', {
        method: 'POST',
        body: { name, endpoint },
      }),
    onSuccess: async ({ id }) => {
      setName('')
      setEndpoint('')
      setExpanded(id)
      await queryClient.invalidateQueries({ queryKey: mcpConnectionsKey })
    },
  })
  return (
    <Card className="gap-3 rounded-card p-4">
      <h2 className="font-semibold">Conexões MCP</h2>
      {canManage && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate()
          }}
        >
          <label htmlFor="mcp-connection-name" className="grid gap-1 text-sm">
            Nome da conexão MCP
            <Input
              id="mcp-connection-name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label
            htmlFor="mcp-connection-endpoint"
            className="grid min-w-0 flex-1 gap-1 text-sm"
          >
            URL do servidor MCP
            <Input
              id="mcp-connection-endpoint"
              required
              type="url"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={create.isPending}>
            Cadastrar MCP
          </Button>
        </form>
      )}
      {create.isError && (
        <p role="alert" className="text-destructive">
          {create.error.message}
        </p>
      )}
      {connections.isPending && <p role="status">Carregando conexões MCP…</p>}
      {connections.isError && (
        <p role="alert" className="text-destructive">
          {connections.error.message}
        </p>
      )}
      {connections.data?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma conexão MCP cadastrada.
        </p>
      )}
      {connections.data?.map((connection) => (
        <section
          key={connection.id}
          className="grid min-w-0 gap-2 rounded-md border p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 break-all">
              <h3 className="text-sm font-medium">{connection.name}</h3>
              {connection.endpoint && (
                <p className="text-muted-foreground text-xs">
                  {connection.endpoint}
                </p>
              )}
            </div>
            {canManage && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-expanded={expanded === connection.id}
                onClick={() =>
                  setExpanded(expanded === connection.id ? null : connection.id)
                }
              >
                Ferramentas
              </Button>
            )}
          </div>
          {canManage && expanded === connection.id && (
            <McpCatalog connection={connection} />
          )}
        </section>
      ))}
    </Card>
  )
}
