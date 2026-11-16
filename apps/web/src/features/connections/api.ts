import type {
  ConnectionCreate,
  ConnectionDto,
  ConnectionSchemaDto,
  ConnectionUpdate,
  ExampleSetting,
  SchemaStateDto,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const CONNECTIONS_QUERY_KEY = ['connections'] as const

export function useConnections() {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: () => apiFetch<ConnectionDto[]>('/api/connections'),
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
    queryFn: () =>
      apiFetch<ConnectionSchemaDto>(`/api/connections/${id}/schema`),
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
      queryClient.setQueryData<ConnectionSchemaDto>(
        schemaQueryKey(id),
        (current) => (current ? { ...current, ...state } : current),
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
      queryClient.setQueryData<ConnectionSchemaDto>(
        schemaQueryKey(id),
        (current) => {
          if (!current) return current
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
        },
      )
    },
  })
}
