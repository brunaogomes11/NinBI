import type { ConnectionSchemaDto } from '@ninbi/contracts'
import { HttpResponse, http, type RequestHandler } from 'msw'

/** Texto de 5.000 caracteres (entre aspas) para os testes de truncamento. */
export const LONG_TEXT = `'${'descrição longa '.repeat(320).slice(0, 4998)}'`

/**
 * Schema do "Varejo" em miniatura: labels `Cliente`, `Pedido` e `Produto`, tipos `FEZ` e `CONTEM`,
 * com exemplos de texto, data, ponto, lista, mapa e texto longo, e uma propriedade sem exemplo.
 */
export function makeSchema(
  overrides: Partial<ConnectionSchemaDto> = {},
): ConnectionSchemaDto {
  return {
    connectionId: 'c-1',
    connectionName: 'Vendas',
    status: 'READY',
    readAt: '2026-11-16T17:30:00Z',
    startedAt: null,
    error: null,
    labels: [
      {
        name: 'Cliente',
        properties: [
          {
            name: 'email',
            types: ['String'],
            example: "'ana@exemplo.com'",
            sendExample: true,
          },
          {
            name: 'nome',
            types: ['String'],
            example: "'Ana'",
            sendExample: true,
          },
        ],
      },
      {
        name: 'Pedido',
        properties: [
          {
            name: 'codigo',
            types: ['String', 'Long'],
            example: "'P-0001'",
            sendExample: true,
          },
          {
            name: 'data',
            types: ['Date'],
            example: "date('2024-02-05')",
            sendExample: true,
          },
          {
            name: 'entrega',
            types: ['Point'],
            example: 'point({srid: 4326, x: -46.63, y: -23.55})',
            sendExample: true,
          },
          {
            name: 'itens',
            types: ['List'],
            example: '[1, 2]',
            sendExample: true,
          },
          {
            name: 'meta',
            types: ['Map'],
            example: "{nome: 'Ana'}",
            sendExample: true,
          },
          { name: 'obs', types: ['String'], example: null, sendExample: true },
        ],
      },
      {
        name: 'Produto',
        properties: [
          {
            name: 'descricao',
            types: ['String'],
            example: LONG_TEXT,
            sendExample: true,
          },
        ],
      },
    ],
    relationshipTypes: [
      {
        name: 'CONTEM',
        properties: [
          {
            name: 'quantidade',
            types: ['Long'],
            example: '3',
            sendExample: true,
          },
        ],
        patterns: [{ from: 'Pedido', to: 'Produto' }],
      },
      {
        name: 'FEZ',
        properties: [],
        patterns: [{ from: 'Cliente', to: 'Pedido' }],
      },
    ],
    ...overrides,
  }
}

/** `GET /api/connections/:id/schema` com o schema dado (ou uma função que o devolve a cada chamada). */
export function schemaHandler(
  schema: ConnectionSchemaDto | (() => ConnectionSchemaDto) = makeSchema(),
): RequestHandler {
  return http.get('/api/connections/:id/schema', () =>
    HttpResponse.json(typeof schema === 'function' ? schema() : schema),
  )
}
