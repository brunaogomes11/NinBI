import type { ConnectionDto } from '@ninbi/contracts'
import { HttpResponse, http, type RequestHandler } from 'msw'

/** Uma conexão da lista (Vendas, com schema lido às 14:30 de 16/11/2026 em São Paulo, por padrão). */
export function makeConnection(
  overrides: Partial<ConnectionDto> = {},
): ConnectionDto {
  return {
    id: 'c-1',
    name: 'Vendas',
    type: 'NEO4J',
    uri: 'neo4j+s://vendas.exemplo:7687',
    host: null,
    port: null,
    ssl: false,
    database: null,
    username: 'neo4j',
    schemaStatus: 'READY',
    schemaReadAt: '2026-11-16T17:30:00Z',
    ...overrides,
  }
}

/** `GET /api/connections` com a lista dada. */
export function connectionsHandler(
  connections: ConnectionDto[] = [],
): RequestHandler {
  return http.get('/api/connections', () => HttpResponse.json(connections))
}
