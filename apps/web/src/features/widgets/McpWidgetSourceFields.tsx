import {
  type DashboardFilter,
  filterParameterNames,
  type McpCall,
  mcpCallSchema,
} from '@ninbi/contracts'
import { Textarea } from '@/components/ui/textarea'
import { useMcpConnections, useMcpTools } from '@/features/connections/mcp-api'

export interface McpSourceDraft {
  connectionId: string
  tool: string
  listKey: string
  argumentsJson: string
  filterBindings: Record<string, string>
}

export function mcpSourceDraft(call?: McpCall): McpSourceDraft {
  return {
    connectionId: call?.connectionId ?? '',
    tool: call?.tool ?? '',
    listKey: call ? JSON.stringify(call.listPath) : '',
    argumentsJson: JSON.stringify(call?.arguments ?? {}, null, 2),
    filterBindings: call?.filterBindings ?? {},
  }
}

export function parseMcpSource(draft: McpSourceDraft): McpCall | undefined {
  try {
    const parsed = mcpCallSchema.safeParse({
      connectionId: draft.connectionId,
      tool: draft.tool,
      listPath: JSON.parse(draft.listKey),
      arguments: JSON.parse(draft.argumentsJson),
      filterBindings: draft.filterBindings,
    })
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export const sourceSelectClass =
  'min-h-9 w-full rounded-md border bg-background px-2 text-sm'

export function McpWidgetSourceFields({
  value,
  filters,
  onChange,
}: {
  value: McpSourceDraft
  filters: DashboardFilter[]
  onChange: (next: McpSourceDraft) => void
}) {
  const connections = useMcpConnections()
  const tools = useMcpTools(value.connectionId)
  const available = tools.data?.filter(
    (tool) => tool.enabled && tool.lists.length > 0,
  )
  const selected = available?.find((tool) => tool.name === value.tool)
  const properties = selected?.inputSchema.properties
  const argumentsToBind =
    properties && typeof properties === 'object' && !Array.isArray(properties)
      ? Object.keys(properties)
      : []
  const parameters = filters.flatMap((filter) =>
    filterParameterNames(filter).map((parameter) => ({
      parameter,
      label: filter.label,
    })),
  )
  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        Conexão MCP
        <select
          className={sourceSelectClass}
          value={value.connectionId}
          onChange={(event) =>
            onChange({ ...mcpSourceDraft(), connectionId: event.target.value })
          }
        >
          <option value="">Escolha uma conexão MCP</option>
          {connections.data?.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name}
            </option>
          ))}
        </select>
      </label>
      {connections.isPending && <p role="status">Carregando conexões MCP…</p>}
      {connections.isError && (
        <p role="alert" className="text-destructive">
          {connections.error.message}
        </p>
      )}
      {connections.data?.length === 0 && <p>Nenhuma conexão MCP cadastrada.</p>}
      {value.connectionId && tools.isPending && (
        <p role="status">Carregando ferramentas…</p>
      )}
      {tools.isError && (
        <p role="alert" className="text-destructive">
          {tools.error.message}
        </p>
      )}
      {available?.length === 0 && (
        <p>Nenhuma ferramenta tabular habilitada nesta conexão.</p>
      )}
      <label className="grid gap-1 text-sm">
        Ferramenta MCP
        <select
          className={sourceSelectClass}
          value={value.tool}
          disabled={!available?.length}
          onChange={(event) => {
            const match = available?.find(
              ({ name }) => name === event.target.value,
            )
            onChange({
              ...mcpSourceDraft(),
              connectionId: value.connectionId,
              tool: event.target.value,
              listKey:
                match?.lists.length === 1
                  ? JSON.stringify(match.lists[0].path)
                  : '',
            })
          }}
        >
          <option value="">Escolha uma ferramenta</option>
          {available?.map(({ name }) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          {selected.description && (
            <p className="text-muted-foreground text-sm">
              {selected.description}
            </p>
          )}
          <label className="grid gap-1 text-sm">
            Lista de saída
            <select
              className={sourceSelectClass}
              value={value.listKey}
              onChange={(event) =>
                onChange({ ...value, listKey: event.target.value })
              }
            >
              <option value="">Escolha uma lista</option>
              {selected.lists.map(({ path, columns }) => (
                <option key={JSON.stringify(path)} value={JSON.stringify(path)}>
                  {path.join(' → ') || 'Lista principal'} (
                  {columns
                    .map(({ name, type }) => `${name}: ${type}`)
                    .join(', ')}
                  )
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="mcp-widget-arguments" className="grid gap-1 text-sm">
            Argumentos (JSON)
            <Textarea
              id="mcp-widget-arguments"
              className="font-mono"
              value={value.argumentsJson}
              rows={4}
              onChange={(event) =>
                onChange({ ...value, argumentsJson: event.target.value })
              }
            />
          </label>
          {argumentsToBind.length > 0 && (
            <p className="break-all text-muted-foreground text-xs">
              Argumentos declarados: {argumentsToBind.join(', ')}
            </p>
          )}
          {parameters.length > 0 &&
            argumentsToBind.map((argument) => (
              <label key={argument} className="grid gap-1 text-sm">
                Filtro para {argument}
                <select
                  className={sourceSelectClass}
                  value={value.filterBindings[argument] ?? ''}
                  onChange={(event) => {
                    const bindings = { ...value.filterBindings }
                    if (event.target.value)
                      bindings[argument] = event.target.value
                    else delete bindings[argument]
                    onChange({ ...value, filterBindings: bindings })
                  }}
                >
                  <option value="">Usar argumento fixo</option>
                  {parameters.map(({ parameter, label }) => (
                    <option key={parameter} value={parameter}>
                      {label} ({parameter})
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </>
      )}
    </div>
  )
}
