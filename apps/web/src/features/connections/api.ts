import {
  CONNECTION_TYPE_LABELS,
  type ConnectionCreate,
  type ConnectionDto,
  type ConnectionType,
  type ConnectionUpdate,
  connectionLanguage,
  type ExampleSetting,
  isRelationalSchema,
  type QueryLanguage,
  type SchemaDto,
  type SchemaStateDto,
  SQL_DEFAULT_PORTS,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const CONNECTIONS_QUERY_KEY = ['connections'] as const

/** Nome do tipo da conexão como a tela mostra ("PostgreSQL", "SQL Server"). */
export function connectionTypeLabel(type: ConnectionType): string {
  return CONNECTION_TYPE_LABELS[type]
}

/** Porta padrão do tipo SQL; Neo4j usa URI e não tem porta própria. */
export function defaultPortFor(type: ConnectionType): number | null {
  return type === 'NEO4J' ? null : SQL_DEFAULT_PORTS[type]
}

/** Linguagem da consulta escrita para o tipo de conexão. */
export function queryLanguage(type: ConnectionType): QueryLanguage {
  return connectionLanguage(type)
}

/** Rótulo do campo de consulta da linguagem: "Consulta SQL" ou "Consulta Cypher". */
export function languageLabel(language: QueryLanguage): string {
  return language === 'SQL' ? 'Consulta SQL' : 'Consulta Cypher'
}

/** Rótulo do campo de consulta do tipo de conexão. */
export function queryLabel(type: ConnectionType): string {
  return languageLabel(queryLanguage(type))
}

export function useConnections(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: () => apiFetch<ConnectionDto[]>('/api/connections'),
    enabled: options.enabled ?? true,
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ConnectionCreate) =>
      apiFetch<ConnectionDto>('/api/connections', {
        method: 'POST',
        body: values,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY }),
  })
}

/** Testa os dados do formulário sem gravar; `id` testa uma conexão existente (senha vazia usa a guardada). */
export function useTestConnection(id?: string) {
  return useMutation({
    mutationFn: (values: ConnectionCreate | ConnectionUpdate) =>
      apiFetch<{ ok: true }>(
        id ? `/api/connections/${id}/test` : '/api/connections/test',
        { method: 'POST', body: values },
      ),
  })
}

export function useUpdateConnection(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ConnectionUpdate) =>
      apiFetch<ConnectionDto>(`/api/connections/${id}`, {
        method: 'PATCH',
        body: values,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY }),
  })
}

export function useDeleteConnection(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch(`/api/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY }),
  })
}

export const schemaQueryKey = (id: string) => ['connection-schema', id] as const

/** Schema da conexão; relê a cada 2 s enquanto a leitura está em andamento. */
export function useConnectionSchema(id: string) {
  return useQuery({
    queryKey: schemaQueryKey(id),
    queryFn: () => apiFetch<SchemaDto>(`/api/connections/${id}/schema`),
    refetchInterval: (query) =>
      query.state.data?.status === 'READING' ? 2000 : false,
  })
}

/** Pede uma nova leitura do schema e já mostra o estado devolvido. */
export function useRefreshSchema(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<SchemaStateDto>(`/api/connections/${id}/schema/refresh`, {
        method: 'POST',
      }),
    onSuccess: (state) => {
      queryClient.setQueryData<SchemaDto>(schemaQueryKey(id), (current) =>
        current ? { ...current, ...state } : current,
      )
      return queryClient.invalidateQueries({ queryKey: schemaQueryKey(id) })
    },
  })
}

/** Liga ou desliga o envio do exemplo de uma propriedade à IA. */
export function useSetExampleSetting(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (setting: ExampleSetting) =>
      apiFetch(`/api/connections/${id}/schema/example-settings`, {
        method: 'PUT',
        body: setting,
      }),
    onSuccess: (_data, setting) => {
      queryClient.setQueryData<SchemaDto>(schemaQueryKey(id), (current) => {
        if (!current) return current
        if (isRelationalSchema(current)) {
          if (setting.kind !== 'TABLE') return current
          return {
            ...current,
            tables: current.tables.map((table) =>
              table.name === setting.element
                ? {
                    ...table,
                    columns: table.columns.map((column) =>
                      column.name === setting.property
                        ? { ...column, sendExample: setting.sendExample }
                        : column,
                    ),
                  }
                : table,
            ),
          }
        }
        const apply = <
          T extends {
            name: string
            properties: { name: string; sendExample: boolean }[]
          },
        >(
          elements: T[],
        ): T[] =>
          elements.map((element) =>
            element.name === setting.element
              ? {
                  ...element,
                  properties: element.properties.map((property) =>
                    property.name === setting.property
                      ? { ...property, sendExample: setting.sendExample }
                      : property,
                  ),
                }
              : element,
          )
        return setting.kind === 'LABEL'
          ? { ...current, labels: apply(current.labels) }
          : {
              ...current,
              relationshipTypes: apply(current.relationshipTypes),
            }
      })
    },
  })
}
