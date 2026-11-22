import type { McpConnectionDto } from '@ninbi/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { mcpConnectionsKey, mcpToolsKey, useMcpTools } from './mcp-api'

export function McpCatalog({ connection }: { connection: McpConnectionDto }) {
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
