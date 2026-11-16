import type {
  DashboardDto,
  QueryResultDto,
  SidebarDto,
  WidgetDto,
} from '@ninbi/contracts'
import { HttpResponse, http, type RequestHandler } from 'msw'

/** Resultado de exemplo: duas lojas e o total vendido por cada uma. */
export function makeQueryResult(
  overrides: Partial<QueryResultDto> = {},
): QueryResultDto {
  return {
    columns: ['loja', 'total'],
    rows: [
      ['Centro', 120],
      ['Norte', 80],
    ],
    truncated: false,
    rowLimit: 5000,
    ...overrides,
  }
}

/** Um widget de tabela com consulta salva, na posição 0,0 de 4 por 4. */
export function makeWidget(overrides: Partial<WidgetDto> = {}): WidgetDto {
  return {
    id: 'w-1',
    title: 'Vendas por loja',
    cypher: 'MATCH (l:Loja) RETURN l.nome AS loja',
    hasQuery: true,
    visualization: 'TABLE',
    config: {},
    layout: { x: 0, y: 0, w: 4, h: 4 },
    ...overrides,
  }
}

/** Um dashboard com uma aba e um widget; o usuário pode editar e excluir por padrão. */
export function makeDashboard(
  overrides: Partial<DashboardDto> = {},
): DashboardDto {
  return {
    id: 'd-1',
    name: 'Vendas',
    version: 1,
    updatedAt: '2026-11-16T17:30:00Z',
    ownerId: 'user-ana',
    ownerName: 'Ana Souza',
    connectionId: 'c-1',
    connectionName: 'Vendas',
    permissions: { edit: true, delete: true },
    tabs: [{ id: 't-1', name: 'Aba 1', widgets: [makeWidget()] }],
    ...overrides,
  }
}

/** `GET /api/sidebar` com os itens dados (sem itens por padrão). */
export function sidebarHandler(
  items: SidebarDto['items'] = [],
): RequestHandler {
  return http.get('/api/sidebar', () => HttpResponse.json({ items }))
}

export interface SavedSidebarItem {
  type: string
  id: string
  name?: string
  items?: SavedSidebarItem[]
}
export interface SavedSidebar {
  items: SavedSidebarItem[]
}

/**
 * `PUT /api/sidebar`: guarda cada corpo recebido em `saved` e devolve o layout
 * com os nomes (o nome de um dashboard é o próprio id; o de um grupo vem no corpo).
 */
export function sidebarSaveHandler(saved: SavedSidebar[]): RequestHandler {
  const withNames = (item: SavedSidebarItem): SavedSidebarItem =>
    item.type === 'group'
      ? { ...item, items: (item.items ?? []).map(withNames) }
      : { ...item, name: item.id }
  return http.put('/api/sidebar', async ({ request }) => {
    const body = (await request.json()) as SavedSidebar
    saved.push(body)
    return HttpResponse.json({ items: body.items.map(withNames) })
  })
}
